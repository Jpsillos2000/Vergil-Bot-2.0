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
const { YtDlp } = require('ytdlp-nodejs');

const musicasPath = path.join(__dirname, '..', '..', 'midia');
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

    playerInstance.selectedSongIndex = -1;

    if (playerInstance.lastSong) {
        if (playerInstance.lastSong.isTemp && playerInstance.lastSong.filePath) {
            fs.unlink(playerInstance.lastSong.filePath, () => {});
            if (playerInstance.lastSong.thumbnailPath && !playerInstance.lastSong.thumbnailPath.startsWith('http')) {
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
        let resource;
        let files = [];

        if (song.isStream) {
            const ytdlpPath = path.join(__dirname, '..', '..', 'node_modules', 'ytdlp-nodejs', 'bin', 'yt-dlp');
            const args = [
                song.link,
                '-o', '-',
                '-f', 'bestaudio[acodec=opus]/bestaudio',
                '--quiet',
                '--no-check-certificate',
                '--no-cache-dir',
                '--no-mtime',
                '--extractor-args', 'youtube:player_client=default'
            ];

            const process = spawn(ytdlpPath, args);
            resource = createAudioResource(process.stdout, { inputType: StreamType.Arbitrary });

            process.stderr.on('data', (data) => {
                console.error(`[YTDLP_STDERR] ${data}`);
            });

            process.on('error', (error) => {
                console.error(`[YTDLP_ERROR] ${error}`);
            });

        } else {
            resource = createAudioResource(song.filePath, { inputType: StreamType.Arbitrary });
            if (song.thumbnailPath) {
                files.push(song.thumbnailPath);
            }
        }

        playerInstance.player.play(resource);

        const nowPlayingEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('▶️ Now Playing')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: 'Requested by', value: `<@${song.requestedBy.id}>`, inline: true },
                { name: 'Queue', value: `${playerInstance.queue.length} song(s) remaining`, inline: true }
            )
            .setTimestamp();

        if (song.thumbnailPath) {
            if (song.thumbnailPath.startsWith('http')) {
                nowPlayingEmbed.setThumbnail(song.thumbnailPath);
            } else {
                nowPlayingEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
            }
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
            new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
            new ButtonBuilder().setCustomId('view_queue').setLabel('Queue').setStyle(ButtonStyle.Primary).setEmoji('📜')
        );

        await playerInstance.message.edit({ 
            content: '',
            embeds: [nowPlayingEmbed], 
            components: [row],
            files: files
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
        .setDescription('Plays a song from a file, a link, or the pre-defined list.')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The media file (mp3, mp4) you want to play.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('music')
                .setDescription('Choose a song from the list.')
                .setRequired(false)
                .addChoices(...musicasFiles.map(file => ({ name: file, value: file }))))
        .addStringOption(option =>
            option.setName('link')
                .setDescription('The YouTube/SoundCloud/etc. link to play.')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const attachment = interaction.options.getAttachment('file');
        const musica = interaction.options.getString('music');
        const link = interaction.options.getString('link');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to use this command!');
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.editReply('❌ I need permission to join and speak in your voice channel!');
        }

        if (!attachment && !musica && !link) {
            return interaction.editReply('❌ You need to provide a file, choose a song, or provide a link!');
        }

        let song = {};
        const processSong = async (song) => {
            let playerInstance = interaction.client.playerInstances.get(interaction.guildId);
            const isPlaying = playerInstance && playerInstance.player.state.status !== AudioPlayerStatus.Idle;

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
                    lastSong: null,
                    selectedSongIndex: -1 // -1 indicates not in queue view
                };
                
                playerInstance.subscription = connection.subscribe(player);
                interaction.client.playerInstances.set(interaction.guildId, playerInstance);
            }

            playerInstance.queue.push(song);
            
            // Ephemeral confirmation for the user who added the song
            const addedToQueueEmbed = new EmbedBuilder()
                .setColor('#f5b041')
                .setTitle('🎶 Added to Queue')
                .setDescription(`**${song.title}**`)
                .addFields({ name: 'Position in queue', value: `${playerInstance.queue.length}` });
            
            if (song.thumbnailPath) {
                if (song.thumbnailPath.startsWith('http')) {
                    addedToQueueEmbed.setThumbnail(song.thumbnailPath);
                } else {
                    addedToQueueEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
                }
            }

            await interaction.editReply({ 
                embeds: [addedToQueueEmbed],
                files: [] // No thumbnail in ephemeral message
            });

            // Delete the ephemeral reply after 5 seconds
            setTimeout(() => {
                interaction.deleteReply().catch(error => {
                    // Ignore 'Unknown Message' errors
                    if (error.code === 10008) return;
                    console.error('Failed to delete ephemeral reply:', error);
                });
            }, 5000);

            // If a song is already playing, update the public player message
            if (isPlaying) {
                const currentMessage = playerInstance.message;
                if (currentMessage && currentMessage.embeds.length > 0) {
                    const currentEmbed = currentMessage.embeds[0];
                    const newEmbed = new EmbedBuilder(currentEmbed.data)
                        .spliceFields(-1, 1, { name: 'Queue', value: `${playerInstance.queue.length} song(s) remaining` })
                        .addFields({ name: '⬆️ Added to Queue', value: song.title.substring(0, 1024) });
                        
                    await currentMessage.edit({ embeds: [newEmbed] });
                }
            }


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

        } else if (link) {
            try {
                await interaction.editReply({ content: `📥 Fetching metadata for... **${link}**` });
                
                const ytdlp = new YtDlp();
                const metadata = await ytdlp.getInfoAsync(link);
                const title = metadata.title || 'Unknown Title';
                const thumbnail = metadata.thumbnail || null;

                song = {
                    link: link,
                    title: title,
                    thumbnailPath: thumbnail,
                    requestedBy: interaction.user,
                    isStream: true,
                    isTemp: false
                };
                
                await processSong(song);

            } catch (err) {
                console.error("Error fetching metadata for link:", err);
                await interaction.editReply({ content: '❌ Failed to fetch metadata. The link might be invalid or unsupported.' });
            }

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