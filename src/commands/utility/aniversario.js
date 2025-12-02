const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const birthdaysFilePath = path.join(__dirname, '../../data/birthdays.json');

// Helper to ensure file exists and return data
const getBirthdays = () => {
    if (!fs.existsSync(birthdaysFilePath)) {
        fs.writeFileSync(birthdaysFilePath, '[]', 'utf8');
        return [];
    }
    try {
        const data = fs.readFileSync(birthdaysFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading birthdays file:', error);
        return [];
    }
};

// Helper to save birthdays
const saveBirthdays = (data) => {
    fs.writeFileSync(birthdaysFilePath, JSON.stringify(data, null, 4), 'utf8');
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aniversario')
        .setDescription('Gerenciar aniversários')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adicionar o aniversário de um usuário')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('O usuário aniversariante')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('data')
                        .setDescription('A data do aniversário (DD/MM)')
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Listar todos os aniversários cadastrados')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'adicionar') {
            const user = interaction.options.getUser('usuario');
            const dateStr = interaction.options.getString('data');

            // Simple validation for DD/MM format
            const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
            if (!dateRegex.test(dateStr)) {
                return interaction.reply({
                    content: '❌ Formato de data inválido! Por favor use o formato **DD/MM** (ex: 25/12).',
                    ephemeral: true
                });
            }

            const birthdays = getBirthdays();
            
            // Check if user already exists and update, or push new
            const existingIndex = birthdays.findIndex(b => b.id === user.id);
            
            if (existingIndex !== -1) {
                birthdays[existingIndex] = { id: user.id, name: user.username, date: dateStr };
                saveBirthdays(birthdays);
                return interaction.reply({
                    content: `✅ O aniversário de **${user.username}** foi atualizado para **${dateStr}**!`, 
                    ephemeral: true
                });
            } else {
                birthdays.push({ id: user.id, name: user.username, date: dateStr });
                saveBirthdays(birthdays);
                return interaction.reply({
                    content: `✅ Aniversário de **${user.username}** adicionado para o dia **${dateStr}**!`, 
                    ephemeral: true
                });
            }
        } 
        
        else if (subcommand === 'listar') {
            const birthdays = getBirthdays();

            if (birthdays.length === 0) {
                return interaction.reply({ content: 'Nenhum aniversário cadastrado ainda.', ephemeral: true });
            }

            // Sort birthdays by Month then Day
            birthdays.sort((a, b) => {
                const [dayA, monthA] = a.date.split('/').map(Number);
                const [dayB, monthB] = b.date.split('/').map(Number);
                
                if (monthA !== monthB) return monthA - monthB;
                return dayA - dayB;
            });

            const description = birthdays.map(b => `**${b.date}** - <@${b.id}>`).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('📅 Aniversariantes do Servidor')
                .setDescription(description)
                .setColor('#FF69B4')
                .setFooter({ text: `Total: ${birthdays.length} aniversariantes` });

            return interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};
