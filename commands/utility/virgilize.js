const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
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

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const start = interaction.options.getString('start');
        const end = interaction.options.getString('end');
        
        const tempId = `virgilize-${Date.now()}`;
        const inputPath = path.join(os.tmpdir(), `${tempId}_input.mp4`);
        const outputPath = path.join(os.tmpdir(), `${tempId}_output.mp4`);

        let downloadPromise;

        if (subcommand === 'youtube') {
            const link = interaction.options.getString('link');
            await interaction.editReply(`📥 Downloading YouTube video...`);
            
            downloadPromise = new Promise((resolve, reject) => {
                const ytdlpPath = path.join(__dirname, '..', '..', 'node_modules', 'ytdlp-nodejs', 'bin', 'yt-dlp');
                const ytdlpProcess = spawn(ytdlpPath, [
                    link,
                    '-o', inputPath,
                    '-f', 'best[ext=mp4]'
                ]);

                ytdlpProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`yt-dlp exited with code ${code}`));
                    }
                });
                ytdlpProcess.on('error', reject);
            });

        } else if (subcommand === 'attachment') {
            const attachment = interaction.options.getAttachment('file');
            if (!attachment.contentType?.startsWith('video')) {
                return interaction.editReply('❌ Please attach a valid video file.');
            }
            await interaction.editReply(`📥 Downloading attached file...`);

            downloadPromise = new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(inputPath);
                https.get(attachment.url, (response) => {
                    response.pipe(fileStream);
                    fileStream.on('finish', () => resolve());
                    fileStream.on('error', reject);
                }).on('error', reject);
            });
        }

        try {
            await downloadPromise;

            // --- Duration Check ---
            const duration = await getDuration(inputPath);
            const MAX_DURATION_SECONDS = 120; // 2 minutes

            if (duration > MAX_DURATION_SECONDS) {
                await interaction.editReply(`❌ Video is too long! Max duration is ${MAX_DURATION_SECONDS / 60} minutes.`);
                fs.unlink(inputPath, () => {}); // Clean up the downloaded file
                if (fs.existsSync(outputPath)) { // Check before unlinking
                    fs.unlink(outputPath, () => {}); // Clean up the (potentially empty) output path
                }
                return;
            }
            // --- End Duration Check ---

            await interaction.editReply('⚙️ Processing video... This might take a while.');

            const pythonPath = '/home/kali/Vergil-Bot-2.0-Linux/.venv/bin/python';
            const scriptPath = '/home/kali/Vergil-Bot-2.0-Linux/virgilize.py';
            
            const pythonProcess = spawn(pythonPath, [scriptPath, inputPath, outputPath, start, end]);

            pythonProcess.stdout.on('data', (data) => {
                console.log(`[PYTHON_STDOUT] ${data}`);
                // Update user with progress
                interaction.editReply('⚙️ Processing video...').catch(()=>{});
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
                            await interaction.editReply('❌ The final video is too large to upload (> 8MB). Try a shorter clip.');
                        } else {
                            await interaction.editReply({
                                content: '✅ Here is your Virgilized video!',
                                files: [outputPath]
                            });
                        }
                    } catch (fileError) {
                        console.error('Error accessing file after processing:', fileError);
                        await interaction.editReply('❌ An error occurred while accessing the final video file.');
                    }
                } else {
                    await interaction.editReply('❌ An error occurred during video processing.');
                }
                // Cleanup temp files
                fs.unlink(inputPath, () => {});
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => {});
                }
            });

             pythonProcess.on('error', (err) => {
                console.error('Failed to start Python process.', err);
                interaction.editReply('❌ An error occurred while trying to start the video processor.');
                fs.unlink(inputPath, () => {});
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => {});
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Failed to download the video.');
            fs.unlink(inputPath, () => {});
            if (fs.existsSync(outputPath)) {
                fs.unlink(outputPath, () => {});
            }
        }
    },
};
