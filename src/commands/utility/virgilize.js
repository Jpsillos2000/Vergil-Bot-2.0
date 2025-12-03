const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { spawn, exec } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const fs = require('node:fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('virgilize')
        .setDescription('Creates a "To be continued" meme from a video.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('youtube')
                .setDescription('Use a video from a YouTube link.')
                .addStringOption(option => option.setName('link').setDescription('The YouTube URL').setRequired(true))
                .addStringOption(option => option.setName('start').setDescription('Start time (e.g., 0:10 or 10)').setRequired(true))
                .addStringOption(option => option.setName('end').setDescription('End time (e.g., 0:20 or 20)').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('attachment')
                .setDescription('Use an attached video file.')
                .addAttachmentOption(option => option.setName('file').setDescription('The video file').setRequired(true))
                .addStringOption(option => option.setName('start').setDescription('Start time (e.g., 0:10 or 10)').setRequired(true))
                .addStringOption(option => option.setName('end').setDescription('End time (e.g., 0:20 or 20)').setRequired(true))
        ),

    async _getDuration(filePath) { // Renamed for clarity as an internal helper
        return new Promise((resolve, reject) => {
            const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`ffprobe error: ${stderr}`);
                    return reject(error);
                }
                resolve(parseFloat(stdout.trim()));
            });
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const createStatusEmbed = (status, progress = null, color = 0x0099FF) => {
            const embed = new EmbedBuilder()
                .setTitle('⚔️ Virgilizing Video...')
                .setDescription(`**Status:** ${status}`)
                .setColor(color)
                .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (progress) {
                embed.addFields({ name: 'Progress', value: progress });
            }
            return embed;
        };

        const subcommand = interaction.options.getSubcommand();
        const startStr = interaction.options.getString('start');
        const endStr = interaction.options.getString('end');
        
        // Helper to parse time strings to seconds
        const parseTimeToSeconds = (timeStr) => {
            const parts = timeStr.split(':').map(parseFloat);
            if (parts.length === 1) return parts[0];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            return 0;
        };

        const tempId = `virgilize-${Date.now()}`;
        const inputPath = path.join(os.tmpdir(), `${tempId}_input.mp4`);
        const outputPath = path.join(os.tmpdir(), `${tempId}_output.mp4`);

        let downloadPromise;
        let pythonStart, pythonEnd;

        if (subcommand === 'youtube') {
            const link = interaction.options.getString('link');
            await interaction.editReply({ embeds: [createStatusEmbed('📥 Initializing YouTube download...')] });
            
            const startSeconds = parseTimeToSeconds(startStr);
            const endSeconds = parseTimeToSeconds(endStr);

            downloadPromise = new Promise((resolve, reject) => {
                const ytdlpPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'ytdlp-nodejs', 'bin', 'yt-dlp');
                const ytdlpProcess = spawn(ytdlpPath, [
                    link,
                    '-o', inputPath,
                    '-f', 'best[ext=mp4]',
                    '--download-sections', `*${startSeconds}-${endSeconds}`,
                    '--newline', // Important for parsing progress
                    '--force-overwrites'
                ]);

                let lastUpdate = 0;
                ytdlpProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    // Debug log to see exactly what yt-dlp sends
                    console.log(`[YT-DLP-RAW]: ${output.trim()}`);

                    const lines = output.split('\n');
                    for (const line of lines) {
                        if (!line.trim()) continue;

                        // Strip ANSI codes (colors, cursor moves, etc.)
                        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
                        
                        // Match percentage (e.g., " 5.5%", "100%", "12.3%")
                        const match = cleanLine.match(/(\d+(?:\.\d+)?)%/);
                        
                        if (match) {
                            const percentage = match[1];
                            const now = Date.now();
                            // Update every 2.5 seconds or if it's 100%
                            if (now - lastUpdate > 2500 || percentage === '100') { 
                                interaction.editReply({ 
                                    embeds: [createStatusEmbed('📥 Downloading from YouTube...', `${percentage}%`)] 
                                }).catch((err) => console.error("Error updating interaction:", err));
                                lastUpdate = now;
                            }
                        }
                    }
                });

                ytdlpProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`yt-dlp exited with code ${code}`));
                    }
                });
                ytdlpProcess.on('error', reject);
            });
            
            // After partial download, we process the *entire* downloaded file
            pythonStart = '0'; 
            // pythonEnd will be set to the file's duration after download

        } else if (subcommand === 'attachment') {
            const attachment = interaction.options.getAttachment('file');
            if (!attachment.contentType?.startsWith('video')) {
                return interaction.editReply({ embeds: [createStatusEmbed('❌ Invalid file type. Please attach a video.', null, 0xFF0000)] });
            }
            await interaction.editReply({ embeds: [createStatusEmbed('📥 Downloading attached file...')] });

            downloadPromise = new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(inputPath);
                https.get(attachment.url, (response) => {
                    response.pipe(fileStream);
                    fileStream.on('finish', () => resolve());
                    fileStream.on('error', reject);
                }).on('error', reject);
            });

            pythonStart = startStr;
            pythonEnd = endStr;
        }

        try {
            await downloadPromise;

            // --- Duration Check ---
            const duration = await this._getDuration(inputPath);
            
            // Adjust python arguments if it was a youtube download
            if (subcommand === 'youtube') {
                pythonEnd = duration.toString();
            }

            const MAX_DURATION_SECONDS = 120; // 2 minutes

            // For attachments, we check the *trim* duration. For youtube, the file IS the trim.
            let durationToCheck = duration;
            if (subcommand === 'attachment') {
                 const s = parseTimeToSeconds(pythonStart);
                 const e = parseTimeToSeconds(pythonEnd);
                 durationToCheck = e - s;
            }

            if (durationToCheck > MAX_DURATION_SECONDS) {
                await interaction.editReply({ embeds: [createStatusEmbed(`❌ Video/Clip is too long! Max duration is ${MAX_DURATION_SECONDS / 60} minutes.`, null, 0xFF0000)] });
                fs.unlink(inputPath, () => {});
                if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
                return;
            }
            // --- End Duration Check ---

            await interaction.editReply({ embeds: [createStatusEmbed('⚙️ Processing video... This might take a while.')] });

            const pythonVenvPath = path.join(process.cwd(), '.venv_python', 'bin', 'python');
            const localVenvPath = path.join(process.cwd(), '.venv', 'bin', 'python');
            
            let pythonPath = pythonVenvPath;
            if (!fs.existsSync(pythonPath)) {
                pythonPath = localVenvPath;
            }
            
            console.log(`Using Python environment at: ${pythonPath}`);

            const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'virgilize.py');
            
            const pythonProcess = spawn(pythonPath, [scriptPath, inputPath, outputPath, pythonStart, pythonEnd]);

            pythonProcess.stdout.on('data', (data) => {
                console.log(`[PYTHON_STDOUT] ${data}`);
                // Update user with progress (optional, python script could yield progress too)
                 interaction.editReply({ embeds: [createStatusEmbed('⚙️ Processing video...', 'Applying effects...')] }).catch(()=>{});
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`[PYTHON_STDERR] ${data}`);
            });

            pythonProcess.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const stats = fs.statSync(outputPath);
                        const fileSizeInBytes = stats.size;
                        const discordLimit = 8 * 1024 * 1024; // 8 MB

                        if (fileSizeInBytes > discordLimit) {
                            await interaction.editReply({ embeds: [createStatusEmbed('❌ The final video is too large to upload (> 8MB). Try a shorter clip.', null, 0xFF0000)] });
                        } else {
                            // Success! Send normal message as requested.
                            await interaction.editReply({
                                content: '✅ Here is your Virgilized video!',
                                files: [outputPath],
                                embeds: [] // Clear the status embed
                            });
                        }
                    } catch (fileError) {
                        console.error('Error accessing file after processing:', fileError);
                        await interaction.editReply({ embeds: [createStatusEmbed('❌ An error occurred while accessing the final video file.', null, 0xFF0000)] });
                    }
                } else {
                    await interaction.editReply({ embeds: [createStatusEmbed('❌ An error occurred during video processing.', null, 0xFF0000)] });
                }
                // Cleanup temp files
                fs.unlink(inputPath, () => {});
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => {});
                }
            });

             pythonProcess.on('error', (err) => {
                console.error('Failed to start Python process.', err);
                interaction.editReply({ embeds: [createStatusEmbed('❌ An error occurred while trying to start the video processor.', null, 0xFF0000)] });
                fs.unlink(inputPath, () => {});
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => {});
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ embeds: [createStatusEmbed('❌ Failed to download the video.', null, 0xFF0000)] });
            fs.unlink(inputPath, () => {});
            if (fs.existsSync(outputPath)) {
                fs.unlink(outputPath, () => {});
            }
        }
    },
};
