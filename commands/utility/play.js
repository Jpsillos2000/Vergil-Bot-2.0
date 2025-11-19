const { SlashCommandBuilder } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus,
    StreamType 
} = require('@discordjs/voice');
const { getVoiceConnection } = require('@discordjs/voice');

const https = require('node:https');
const { spawn } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca um arquivo de áudio (MP3) ou vídeo (MP4) anexo no seu canal de voz.')
        .addAttachmentOption(option =>
            option.setName('file') 
                .setDescription('O arquivo de mídia (mp3, mp4) que você quer tocar.')
                .setRequired(true)),

    async execute(interaction) {

        const attachment = interaction.options.getAttachment('file');
        const fileName = attachment.name;
        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guildId;

        console.log(`Attachment: ${attachment}\nVoice Channel: ${voiceChannel}\nGuildID:${guildId}`)

        if (!voiceChannel) {
            return interaction.editReply('❌ Você precisa estar em um canal de voz para usar este comando!');
        }

        if (!attachment || (!attachment.contentType || (!attachment.contentType.startsWith('audio/') && !attachment.contentType.startsWith('video/')))) {
            return interaction.editReply('❌ Por favor, anexe um arquivo de mídia (MP3 ou MP4) válido para tocar.');
        }

        const player = createAudioPlayer();

        player.on('stateChange', (oldState, newState) => {
            console.log(`Status do Player: ${oldState.status} -> ${newState.status}`);
        });

        player.once(AudioPlayerStatus.Playing, () => {
            console.log(`Começou a tocar: ${fileName}`);
            
            // Editamos a resposta original para avisar no chat
            interaction.reply(`▶️ Tocando agora: \`${fileName}\``);
        });

        player.on('error', error => {console.error(`Erro: ${error.message}`)});

        https.get(attachment.url, (responseStream) => {

        const ffmpegProcess = spawn(ffmpeg, [
            '-i', 'pipe:0',              // "pipe:0" significa: Leia o que vem da entrada padrão (do Node)
            '-vn',                       // Remove vídeo
            '-ac', '2',                  // 2 canais
            '-ar', '48000',              // 48khz
            '-f', 'mp3',                 // Converte para MP3
            '-'                          // Manda para a saída padrão
        ]);

        
        ffmpegProcess.stderr.on('data', (data) => {
            // Se quiser ver o log técnico, descomente a linha abaixo:
            //console.log(`FFmpeg Log: ${data.toString()}`);
        });
        
        ffmpegProcess.on('close', (code) => {
            if (code !== 0) console.log(`FFmpeg fechou com código: ${code}`);
        });
        // -------------------------------------------------------------

        
        responseStream.pipe(ffmpegProcess.stdin);

        
        const resource = createAudioResource(ffmpegProcess.stdout, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });

        player.play(resource);
        
    }).on('error', (err) => {
        console.error("Erro ao baixar o arquivo:", err.message);
        interaction.editReply("❌ Erro ao baixar o arquivo de mídia.");
    });
    
        const connection = joinVoiceChannel({
            channelId : voiceChannel.id,
            guildId : guildId,
            adapterCreator : voiceChannel.guild.voiceAdapterCreator
        })

        const subscription = connection.subscribe(player);

        if (subscription){
            setTimeout(() => subscription.unsubscribe(),1500_000)
        }
    }
};