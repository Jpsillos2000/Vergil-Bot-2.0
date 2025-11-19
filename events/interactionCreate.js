const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Handler para Slash Commands
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error("Erro ao executar comando:", error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
				}
			}
			return;
		}

		// Handler para Botões
		if (interaction.isButton()) {
			const playerInstance = interaction.client.playerInstances.get(interaction.guildId);

			if (!playerInstance) {
				await interaction.update({ content: "❌ A sessão de música já terminou.", components: [] });
				return;
			}

			const { player } = playerInstance;

			await interaction.deferUpdate(); // Adia a resposta para evitar que a interação falhe

			switch (interaction.customId) {
				case 'pause':
					player.pause();
					const resumeRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('resume').setLabel('Continuar').setStyle(ButtonStyle.Success).setEmoji('▶️'),
						new ButtonBuilder().setCustomId('skip').setLabel('Pular').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
						new ButtonBuilder().setCustomId('stop').setLabel('Parar').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
					);
					await playerInstance.message.edit({ components: [resumeRow] });
					break;

				case 'resume':
					player.unpause();
					const pauseRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('pause').setLabel('Pausar').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
						new ButtonBuilder().setCustomId('skip').setLabel('Pular').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
						new ButtonBuilder().setCustomId('stop').setLabel('Parar').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
					);
					await playerInstance.message.edit({ components: [pauseRow] });
					break;
				
				case 'skip':
					if (playerInstance.queue.length === 0) {
						await interaction.followUp({content: "⏩ Não há mais músicas na fila. Parando a reprodução.", ephemeral: true});
					} else {
						await interaction.followUp({content: "⏩ Música pulada!", ephemeral: true});
					}
					player.stop(); // Aciona o 'Idle' que tocará a próxima música
					break;

				case 'stop':
					playerInstance.queue = []; // Limpa a fila
					player.stop(); // Aciona o 'Idle' que fará a limpeza geral
					await interaction.followUp({content: "⏹️ Fila limpa e reprodução parada.", ephemeral: true});
					// A mensagem principal será editada pelo listener do 'Idle'
					break;
			}
		}
	},
};