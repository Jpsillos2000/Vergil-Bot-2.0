const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
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
                reject(new Error(`FFmpeg failed to generate thumbnail. Code: ${code}`));
            }
        });
        ffmpegProcess.on('error', err => reject(err));
    });
}

async function playNextInQueue(guildId, client) {
    const playerInstance = client.playerInstances.get(guildId);
    if (!playerInstance) return;

    if (playerInstance.lastSong) {
        if (playerInstance.lastSong.isTemp) {
            fs.unlink(playerInstance.lastSong.filePath, () => {});
            if (playerInstance.lastSong.thumbnailPath) {
                fs.unlink(playerInstance.lastSong.thumbnailPath, () => {});
            }
        }
    }

    if (playerInstance.queue.length === 0) {
        playerInstance.message.edit({ content: '✅ Queue finished!', embeds: [], components: [], files: [] }).catch(console.error);
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
            .setTitle('▶️ Now Playing')
            .setDescription(`**${song.title}**`)
            .addFields({ name: 'Requested by', value: `<@${song.requestedBy.id}>`, inline: true })
            .setTimestamp()
            .setFooter({ text: `Queue: ${playerInstance.queue.length} song(s) remaining` });

        if (song.thumbnailPath) {
            nowPlayingEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
            new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
            new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
        );

        await playerInstance.message.edit({ 
            content: '',
            embeds: [nowPlayingEmbed], 
            components: [row],
            files: song.thumbnailPath ? [song.thumbnailPath] : []
        }).catch(console.error);

    } catch (error) {
        console.error("Error trying to play the next song:", error);
        playerInstance.message.edit({ content: `❌ Error playing ${song.title}. Skipping...`, embeds:[], components:[], files:[] }).catch(console.error);
        playNextInQueue(guildId, client);
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays or adds a file to the playback queue.')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The media file (mp3, mp4) you want to play.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('music')
                .setDescription('Choose a song from the list.')
                .setRequired(false)
                .addChoices(...musicasFiles.map(file => ({ name: file, value: file })))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const attachment = interaction.options.getAttachment('file');
        const musica = interaction.options.getString('music');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to use this command!');
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.editReply('❌ I need permission to join and speak in your voice channel!');
        }

        if (!attachment && !musica) {
            return interaction.editReply('❌ You need to provide a file or choose a song!');
        }

        let song = {};

        const processSong = async (song) => {
            let playerInstance = interaction.client.playerInstances.get(interaction.guildId);

            if (!playerInstance) {
                const player = createAudioPlayer()
                    .on(AudioPlayerStatus.Idle, () => playNextInQueue(interaction.guildId, interaction.client))
                    .on('error', (error) => {
                        console.error(`Error in player for guild ${interaction.guildId}:`, error);
                        playNextInQueue(interaction.guildId, interaction.client);
                    });

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                });

                const initialMessage = await interaction.channel.send({ content: "🎶 Setting up player..." });

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
                .setTitle('🎶 Added to Queue')
                .setDescription(`**${song.title}**`)
                .addFields({ name: 'Position in queue', value: `${playerInstance.queue.length}` });
            
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
                thumbnailPath: null,
                title: musica,
                requestedBy: interaction.user,
                isTemp: false
            };
            await processSong(song);

        } else if (attachment) {
            if (!attachment.name) {
                console.error("Attachment received without a name:", attachment);
                return interaction.editReply({ content: '❌ An error occurred: the attachment does not have a valid name.' });
            }
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
                            isTemp: true
                        };
                        
                        await processSong(song);

                    } catch (err) {
                        console.error("Error in post-download processing:", err);
                        await interaction.editReply({ content: '❌ Failed to process the file and generate the thumbnail.' });
                        fs.unlink(tempFilePath, () => {});
                    }
                });

                fileStream.on('error', (err) => {
                    console.error("Error saving temporary file:", err);
                    interaction.editReply("❌ Error downloading or saving the file.");
                });
            }).on('error', (err) => {
                console.error("Download error:", err);
                interaction.editReply("❌ Critical error trying to download the media file.");
            });
        }
    }
};

module.exports.playNextInQueue = playNextInQueue;