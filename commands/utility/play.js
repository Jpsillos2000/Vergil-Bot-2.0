const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus,
    StreamType 
} = require('@discordjs/voice');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { spawn } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

const musicasPath = path.join(__dirname, '..', '..', 'music');
const musicasFiles = fs.readdirSync(musicasPath).filter(file => file.endsWith('.mp3') || file.endsWith('.mp4'));

// --- Funções Auxiliares ---

/**
 * Gera uma thumbnail a partir de um arquivo de vídeo.
 * @param {string} videoPath - Caminho para o arquivo de vídeo.
 * @returns {Promise<string>} - Promise que resolve com o caminho para a thumbnail gerada.
 */
function generateThumbnail(videoPath) {
    return new Promise((resolve, reject) => {
        const thumbnailPath = `${videoPath}.png`;
        const ffmpegProcess = spawn(ffmpeg, [
            '-i', videoPath,
            '-ss', '00:00:01.000',
            '-vframes', '1',
            thumbnailPath
        ]);

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                resolve(thumbnailPath);
            } else {
                reject(new Error(`FFmpeg falhou ao gerar thumbnail. Código: ${code}`));
            }
        });
        ffmpegProcess.on('error', err => reject(err));
    });
}

/**
 * Toca a próxima música na fila de um servidor.
 * @param {string} guildId - O ID do servidor.
 * @param {import('discord.js').Client} client - A instância do cliente do bot.
 */
async function playNextInQueue(guildId, client) {
    const playerInstance = client.playerInstances.get(guildId);
    if (!playerInstance) return;

    // Limpa os arquivos da música anterior (áudio e thumbnail)
    if (playerInstance.lastSong) {
        // Unlink only if it's a temporary file
        if (playerInstance.lastSong.isTemp) {
            fs.unlink(playerInstance.lastSong.filePath, () => {});
            if (playerInstance.lastSong.thumbnailPath) {
                fs.unlink(playerInstance.lastSong.thumbnailPath, () => {});
            }
        }
    }

    if (playerInstance.queue.length === 0) {
        playerInstance.message.edit({ content: '✅ Fila finalizada!', embeds: [], components: [], files: [] }).catch(console.error);
        playerInstance.connection.destroy();
        client.playerInstances.delete(guildId);
        return;
    }

    const song = playerInstance.queue.shift();
    playerInstance.lastSong = song;

    try {
        const resource = createAudioResource(song.filePath, { inputType: StreamType.Arbitrary });
        playerInstance.player.play(resource);

        const nowPlayingEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('▶️ Tocando Agora')
            .setDescription(`**${song.title}**`)
            .addFields({ name: 'Pedida por', value: `<@${song.requestedBy.id}>`, inline: true })
            .setTimestamp()
            .setFooter({ text: `Fila: ${playerInstance.queue.length} música(s) restante(s)` });

        if (song.thumbnailPath) {
            nowPlayingEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pause').setLabel('Pausar').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
            new ButtonBuilder().setCustomId('skip').setLabel('Pular').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
            new ButtonBuilder().setCustomId('stop').setLabel('Parar').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
        );

        await playerInstance.message.edit({ 
            content: '',
            embeds: [nowPlayingEmbed], 
            components: [row],
            files: song.thumbnailPath ? [song.thumbnailPath] : []
        }).catch(console.error);

    } catch (error) {
        console.error("Erro ao tentar tocar a próxima música:", error);
        playerInstance.message.edit({ content: `❌ Erro ao tocar ${song.title}. Pulando...`, embeds:[], components:[], files:[] }).catch(console.error);
        playNextInQueue(guildId, client);
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca ou adiciona um arquivo à fila de reprodução.')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('O arquivo de mídia (mp3, mp4) que você quer tocar.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('musica')
                .setDescription('Escolha uma música da lista.')
                .setRequired(false)
                .addChoices(...musicasFiles.map(file => ({ name: file, value: file })))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const attachment = interaction.options.getAttachment('file');
        const musica = interaction.options.getString('musica');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ Você precisa estar em um canal de voz para usar este comando!');
        }

        if (!attachment && !musica) {
            return interaction.editReply('❌ Você precisa fornecer um arquivo ou escolher uma música!');
        }

        let song = {};

        const processSong = async (song) => {
            let playerInstance = interaction.client.playerInstances.get(interaction.guildId);

            if (!playerInstance) {
                const player = createAudioPlayer()
                    .on(AudioPlayerStatus.Idle, () => playNextInQueue(interaction.guildId, interaction.client))
                    .on('error', (error) => {
                        console.error(`Erro no player do guild ${interaction.guildId}:`, error);
                        playNextInQueue(interaction.guildId, interaction.client);
                    });

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });

                const initialMessage = await interaction.channel.send({ content: "🎶 Configurando player..." });

                playerInstance = {
                    player,
                    connection,
                    queue: [],
                    message: initialMessage,
                    lastSong: null
                };
                
                playerInstance.subscription = connection.subscribe(player);
                interaction.client.playerInstances.set(interaction.guildId, playerInstance);
            }

            playerInstance.queue.push(song);
            
            const addedToQueueEmbed = new EmbedBuilder()
                .setColor('#f5b041')
                .setTitle('🎶 Adicionado à Fila')
                .setDescription(`**${song.title}**`)
                .addFields({ name: 'Posição na fila', value: `${playerInstance.queue.length}` });
            
            if (song.thumbnailPath) {
                addedToQueueEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
            }

            await interaction.editReply({ 
                embeds: [addedToQueueEmbed],
                files: song.thumbnailPath ? [song.thumbnailPath] : []
            });

            if (playerInstance.player.state.status === AudioPlayerStatus.Idle) {
                playNextInQueue(interaction.guildId, interaction.client);
            }
        };

        if (musica) {
            const filePath = path.join(musicasPath, musica);
            song = {
                filePath: filePath,
                thumbnailPath: null, // Local files won't have thumbnails for now
                title: musica,
                requestedBy: interaction.user,
                isTemp: false // It's not a temporary file
            };
            await processSong(song);

        } else if (attachment) {
            const isVideo = attachment.contentType.startsWith('video/');

            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `gemini-bot-${Date.now()}-${attachment.name}`);
            const fileStream = fs.createWriteStream(tempFilePath);
            
            https.get(attachment.url, (responseStream) => {
                responseStream.pipe(fileStream);

                fileStream.on('finish', async () => {
                    try {
                        const thumbnailPath = isVideo 
                            ? await generateThumbnail(tempFilePath) 
                            : null;

                        song = {
                            filePath: tempFilePath,
                            thumbnailPath: thumbnailPath,
                            title: attachment.name,
                            requestedBy: interaction.user,
                            isTemp: true // It's a temporary file
                        };
                        
                        await processSong(song);

                    } catch (err) {
                        console.error("Erro no processamento pós-download:", err);
                        await interaction.editReply({ content: '❌ Falha ao processar o arquivo e gerar a thumbnail.' });
                        fs.unlink(tempFilePath, () => {});
                    }
                });

                fileStream.on('error', (err) => {
                    console.error("Erro ao salvar arquivo temporário:", err);
                    interaction.editReply("❌ Erro ao baixar ou salvar o arquivo.");
                });
            }).on('error', (err) => {
                console.error("Erro de download:", err);
                interaction.editReply("❌ Erro crítico ao tentar baixar o arquivo de mídia.");
            });
        }
    }
};

// Exporta a função para poder ser usada em outros lugares, se necessário
module.exports.playNextInQueue = playNextInQueue;