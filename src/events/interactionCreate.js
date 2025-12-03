const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { handleInteraction: handleBirthdayInteraction } = require('../utils/birthdayManager');

// This helper function renders the interactive queue view
async function renderQueueView(interaction, playerInstance) {
    const queue = playerInstance.queue;
    const selectedIndex = playerInstance.selectedSongIndex;

    if (!queue || queue.length === 0) {
        // Re-render the 'Now Playing' view if queue is empty
        await renderNowPlayingView(interaction, playerInstance);
        const emptyQueueMessage = await interaction.followUp({ content: 'The queue is empty.', ephemeral: true });
        setTimeout(() => {
            emptyQueueMessage.delete().catch(error => {
                if (error.code === 10008) return;
                console.error('Failed to delete ephemeral message:', error);
            });
        }, 5000);
        return;
    }

    const selectedSong = queue[selectedIndex];

    // Create the description with a "window" of songs around the selected one
    const window = 5; // Show 5 songs before and 4 after
    const start = Math.max(0, selectedIndex - window);
    const end = Math.min(queue.length, selectedIndex + window + 1);

    const queueString = queue.slice(start, end).map((song, index) => {
        const i = start + index;
        if (i === selectedIndex) {
            return `**➡️ ${i + 1}. ${song.title}**`;
        }
        return `${i + 1}. ${song.title}`;
    }).join('\n');

    const queueEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎶 Queue: Selecting Song ${selectedIndex + 1}/${queue.length}`)
        .setDescription(queueString)
        .setTimestamp();

    let files = [];
    if (selectedSong.thumbnailPath) {
        if (selectedSong.thumbnailPath.startsWith('http')) {
            queueEmbed.setThumbnail(selectedSong.thumbnailPath);
        } else {
            queueEmbed.setThumbnail(`attachment://${path.basename(selectedSong.thumbnailPath)}`);
            files.push(selectedSong.thumbnailPath);
        }
    }
    
    const queueNavRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('queue_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
        new ButtonBuilder().setCustomId('queue_prev_song').setLabel('Up').setStyle(ButtonStyle.Primary).setEmoji('🔼').setDisabled(selectedIndex === 0),
        new ButtonBuilder().setCustomId('queue_next_song').setLabel('Down').setStyle(ButtonStyle.Primary).setEmoji('🔽').setDisabled(selectedIndex >= queue.length - 1),
        new ButtonBuilder().setCustomId('play_selected').setLabel('Play Selected').setStyle(ButtonStyle.Success).setEmoji('▶️')
    );

    await interaction.update({ embeds: [queueEmbed], components: [queueNavRow], files: files });
}

// This helper function renders the 'Now Playing' view
async function renderNowPlayingView(interaction, playerInstance, isPaused = false) {
    const song = playerInstance.lastSong;
    
    // Determine the response method based on interaction state
    const responseMethod = interaction.deferred || interaction.replied ? 'editReply' : 'update';

    if (!song) {
        // If nothing is playing, send an appropriate message
        await interaction[responseMethod]({ content: 'Nothing is playing right now.', embeds: [], components: [] });
        return;
    }

    const nowPlayingEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('▶️ Now Playing')
        .setDescription(`**${song.title}**`)
        .addFields(
            { name: 'Requested by', value: `<@${song.requestedBy.id}>`, inline: true },
            { name: 'Queue', value: `${playerInstance.queue.length} song(s) remaining`, inline: true }
        )
        .setTimestamp();
    
    let files = [];
    if (song.thumbnailPath) {
        if (song.thumbnailPath.startsWith('http')) {
            nowPlayingEmbed.setThumbnail(song.thumbnailPath);
        } else {
            files.push(song.thumbnailPath);
            nowPlayingEmbed.setThumbnail(`attachment://${path.basename(song.thumbnailPath)}`);
        }
    }

    const components = [];
    if (isPaused) {
        components.push(
            new ButtonBuilder().setCustomId('resume').setLabel('Resume').setStyle(ButtonStyle.Success).setEmoji('▶️'),
            new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
            new ButtonBuilder().setCustomId('view_queue').setLabel('Queue').setStyle(ButtonStyle.Primary).setEmoji('📜'),
            new ButtonBuilder().setCustomId('clear_queue').setLabel('Clear').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );
    } else {
        components.push(
            new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
            new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
            new ButtonBuilder().setCustomId('view_queue').setLabel('Queue').setStyle(ButtonStyle.Primary).setEmoji('📜'),
            new ButtonBuilder().setCustomId('clear_queue').setLabel('Clear').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );
    }
    const row = new ActionRowBuilder().addComponents(components);

    await interaction[responseMethod]({ embeds: [nowPlayingEmbed], components: [row], files: files });
}


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

        // Handle Birthday System Interactions
        if (interaction.customId && interaction.customId.startsWith('aniversario_')) {
            try {
                await handleBirthdayInteraction(interaction);
            } catch (error) {
                console.error('Error in birthday handler:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Ocorreu um erro ao processar a solicitação.', ephemeral: true });
                }
            }
            return;
        }

		if (interaction.isButton()) {
			const playerInstance = interaction.client.playerInstances.get(interaction.guildId);
			if (!playerInstance) {
				await interaction.update({ content: "❌ The music session has already ended.", components: [] });
                setTimeout(() => interaction.message.delete().catch(() => {}), 5000);
				return;
			}
			const { player } = playerInstance;

			switch (interaction.customId) {
				case 'pause':
                    await interaction.deferUpdate();
					player.pause();
					await renderNowPlayingView(interaction, playerInstance, true);
					break;

				case 'resume':
                    await interaction.deferUpdate();
					player.unpause();
					await renderNowPlayingView(interaction, playerInstance, false);
					break;
				
				case 'stop':
                    await interaction.deferUpdate();
					playerInstance.queue = [];
					player.stop();
					const stopMessage = await interaction.followUp({content: "⏹️ Queue cleared and playback stopped.", ephemeral: true});
                    setTimeout(async () => {
                        try {
                            await stopMessage.delete();
                        } catch (error) {
                            if (error.code !== 10008) console.error('Failed to delete stop message:', error);
                        }
                    }, 5000);
					break;

                case 'clear_queue':
                    await interaction.deferUpdate();
                    const queueLength = playerInstance.queue.length;
                    playerInstance.queue = [];
                    
                    const clearMessage = await interaction.followUp({content: `🗑️ Cleared **${queueLength}** songs from the queue.`, ephemeral: true});
                    setTimeout(async () => {
                        try {
                            await clearMessage.delete();
                        } catch (error) {
                            if (error.code !== 10008) console.error('Failed to delete clear message:', error);
                        }
                    }, 5000);
                    
                    // Refresh the view to show the empty queue status
                    await renderNowPlayingView(interaction, playerInstance, player.state.status === 'paused');
                    break;

				case 'view_queue':
                    playerInstance.selectedSongIndex = 0;
					await renderQueueView(interaction, playerInstance);
					break;

                case 'queue_next_song':
                    if (playerInstance.selectedSongIndex < playerInstance.queue.length - 1) {
                        playerInstance.selectedSongIndex++;
                    }
                    await renderQueueView(interaction, playerInstance);
                    break;
                
                case 'queue_prev_song':
                    if (playerInstance.selectedSongIndex > 0) {
                        playerInstance.selectedSongIndex--;
                    }
                    await renderQueueView(interaction, playerInstance);
                    break;

                case 'play_selected':
                    await interaction.deferUpdate();
                    const selectedSong = playerInstance.queue.splice(playerInstance.selectedSongIndex, 1)[0];
                    if (selectedSong) {
                        playerInstance.queue.unshift(selectedSong);
                        player.stop(); // This will trigger playNextInQueue to play the selected song
                        player.unpause(); // Ensure it resumes if it was paused
                        const playMessage = await interaction.followUp({ content: `⏭️ Skipping to **${selectedSong.title}**`, ephemeral: true });
                        setTimeout(async () => {
                            try {
                                await playMessage.delete();
                            } catch (error) {
                                if (error.code !== 10008) console.error('Failed to delete skipping message:', error);
                            }
                        }, 5000);
                    }
                    break;

                case 'queue_back':
                    playerInstance.selectedSongIndex = -1;
                    await renderNowPlayingView(interaction, playerInstance, player.state.status === 'paused');
                    break;
			}
		}
	},
};