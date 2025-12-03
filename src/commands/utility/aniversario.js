const { SlashCommandBuilder } = require('discord.js');
const { getBirthdayDashboard } = require('../../utils/birthdayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aniversario')
        .setDescription('Gerenciar aniversários (Dashboard Interativo)'),
    
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'Este comando só pode ser usado em servidores.', ephemeral: true });
        }

        // Defer reply if fetching takes time, though usually fast
        // But we want to reply with the dashboard directly.
        
        try {
            const dashboard = await getBirthdayDashboard(interaction.guildId, interaction.guild.name);
            await interaction.reply(dashboard);
        } catch (error) {
            console.error('Error executing aniversario command:', error);
            await interaction.reply({ content: 'Ocorreu um erro ao carregar o painel de aniversários.', ephemeral: true });
        }
    },
};
