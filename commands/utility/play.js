// commands/utility/play.js
const { SlashCommandBuilder } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    StreamType, // Necessário para streams como MP4
} = require('@discordjs/voice');

// Este mapa armazenará a conexão e o player de áudio para cada Guild ID
const guildState = new Map(); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca um arquivo de áudio (MP3) ou vídeo (MP4) anexo no seu canal de voz.')
        .addAttachmentOption(option =>
            option.setName('file') 
                .setDescription('O arquivo de mídia (mp3, mp4) que você quer tocar.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        // 1. **Coleta de Dados e Verificações Iniciais**
        const attachment = interaction.options.getAttachment('file');

        console.log(attachment)
        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guildId;

        if (!voiceChannel) {
            return interaction.editReply('Você precisa estar em um canal de voz para usar este comando!');
        }

        // CORREÇÃO: Verifica se o anexo é nulo antes de tentar acessar suas propriedades
        if (!attachment) {
            return interaction.editReply('❌ Por favor, anexe um arquivo de mídia (MP3 ou MP4) válido para tocar.');
        }

        // Verifica o tipo de anexo (áudio/vídeo)
        if (!attachment.contentType || (!attachment.contentType.startsWith('audio/') && !attachment.contentType.startsWith('video/'))) {
            return interaction.editReply('O anexo deve ser um arquivo de áudio ou vídeo válido (mp3/mp4/etc.).');
        }

        // 2. **Gerenciamento do Estado da Guild (Conexão e Player)**
        let state = guildState.get(guildId);
        let connection = state ? state.connection : null;
        let player = state ? state.player : null;

        try {
            // **Conexão de Voz**
            if (!connection || connection.state.status === 'destroyed') {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true,
                });
            }

            // **Criação do Player**
            if (!player) {
                player = createAudioPlayer();
                
                player.on(AudioPlayerStatus.Idle, () => {
                    console.log('Reprodução terminada. Saindo do canal.');
                    // Destrói a conexão e limpa o estado da Guild quando o player para
                    connection.destroy();
                    guildState.delete(guildId); 
                });

                player.on('error', error => {
                    console.error(`Erro no player: ${error.message}`);
                    interaction.channel.send(`❌ Ocorreu um erro na reprodução: ${error.message} (Verifique se o FFMPEG está instalado.)`).catch(console.error);
                });

                guildState.set(guildId, { connection, player });
            } 
            
            // Garante que o player está conectado à conexão atual
            connection.subscribe(player);
            
            // 3. **Criação e Reprodução do Recurso de Áudio**
            
            const resource = createAudioResource(attachment.url, {
                inlineVolume: true,
                // ESSENCIAL: Usa FFMPEG para tratar o stream do Discord (necessário para MP4)
                inputType: StreamType.Arbitrary, 
            });
            
            const title = attachment.name;
            
            player.play(resource);

            return interaction.editReply(`▶️ Começando a tocar o arquivo: **${title}**`);

        } catch (error) {
            console.error(error);
            // Limpa o estado em caso de erro de conexão/reprodução
            if (connection && connection.state.status !== 'destroyed') connection.destroy();
            guildState.delete(guildId); 

            return interaction.editReply(`❌ Ocorreu um erro ao tentar tocar o anexo. Erro: ${error.message}. Certifique-se de que o **FFMPEG** está instalado corretamente.`);
        }
    },
};