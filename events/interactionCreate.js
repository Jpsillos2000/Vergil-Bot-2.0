const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error("Error executing command:", error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'An error occurred while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'An error occurred while executing this command!', ephemeral: true });
				}
			}
			return;
		}

		if (interaction.isButton()) {
			const playerInstance = interaction.client.playerInstances.get(interaction.guildId);

			if (!playerInstance) {
				await interaction.update({ content: "❌ The music session has already ended.", components: [] });
				return;
			}

			const { player } = playerInstance;

			await interaction.deferUpdate();

			switch (interaction.customId) {
				case 'pause':
					player.pause();
					const resumeRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('resume').setLabel('Resume').setStyle(ButtonStyle.Success).setEmoji('▶️'),
						new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
						new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
					);
					await playerInstance.message.edit({ components: [resumeRow] });
					break;

				case 'resume':
					player.unpause();
					const pauseRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
						new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
						new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
					);
					await playerInstance.message.edit({ components: [pauseRow] });
					break;
				
				case 'skip':
					if (playerInstance.queue.length === 0) {
						await interaction.followUp({content: "⏩ There are no more songs in the queue. Stopping playback.", ephemeral: true});
					} else {
						await interaction.followUp({content: "⏩ Song skipped!", ephemeral: true});
					}
					player.stop();
					break;

				case 'stop':
					if (playerInstance.queue && playerInstance.queue.length > 0) {
						for (const song of playerInstance.queue) {
							if (song.isTemp) {
								fs.unlink(song.filePath, (err) => {
									if (err) console.error(`Failed to delete temp file: ${song.filePath}`, err);
								});
								if (song.thumbnailPath) {
									fs.unlink(song.thumbnailPath, (err) => {
										if (err) console.error(`Failed to delete temp thumbnail: ${song.thumbnailPath}`, err);
									});
								}
							}
						}
					}
					playerInstance.queue = [];
					player.stop();
					await interaction.followUp({content: "⏹️ Queue cleared and playback stopped.", ephemeral: true});
					break;
			}
		}
	},
};