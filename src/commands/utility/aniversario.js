const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const birthdaysFilePath = path.join(__dirname, '../../data/birthdays.json');

// Helper to ensure file exists and return data
const getBirthdaysData = () => {
    if (!fs.existsSync(birthdaysFilePath)) {
        fs.writeFileSync(birthdaysFilePath, '{}', 'utf8');
        return {};
    }
    try {
        const content = fs.readFileSync(birthdaysFilePath, 'utf8');
        // Handle legacy array format by returning empty object (migration happens in ready.js)
        // or return parsed object if valid
        if (content.trim().startsWith('[')) return {}; 
        return JSON.parse(content);
    } catch (error) {
        console.error('Error reading birthdays file:', error);
        return {};
    }
};

// Helper to save data
const saveData = (data) => {
    fs.writeFileSync(birthdaysFilePath, JSON.stringify(data, null, 4), 'utf8');
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aniversario')
        .setDescription('Gerenciar aniversários do servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('configurar')
                .setDescription('Define o canal de avisos de aniversário')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal onde as mensagens serão enviadas')
                        .setRequired(true)))
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
                .setDescription('Listar todos os aniversários deste servidor')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        
        if (!guildId) return interaction.reply({ content: 'Este comando só pode ser usado em servidores.', ephemeral: true });

        let allData = getBirthdaysData();
        
        // Ensure guild entry exists
        if (!allData[guildId]) {
            allData[guildId] = { channelId: null, users: [] };
        }

        if (subcommand === 'configurar') {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Você precisa de permissão para gerenciar canais para usar este comando.', ephemeral: true });
            }

            const channel = interaction.options.getChannel('canal');
            
            // Update channel ID
            allData[guildId].channelId = channel.id;
            saveData(allData);

            return interaction.reply({ 
                content: `✅ O canal de aniversários foi definido para ${channel}!`, 
                ephemeral: false 
            });
        }

        else if (subcommand === 'adicionar') {
            const user = interaction.options.getUser('usuario');
            const dateStr = interaction.options.getString('data');

            // Validation
            const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
            if (!dateRegex.test(dateStr)) {
                return interaction.reply({ 
                    content: '❌ Formato de data inválido! Por favor use o formato **DD/MM** (ex: 25/12).', 
                    ephemeral: true 
                });
            }

            const guildUsers = allData[guildId].users;
            const existingIndex = guildUsers.findIndex(b => b.id === user.id);
            
            if (existingIndex !== -1) {
                guildUsers[existingIndex] = { id: user.id, name: user.username, date: dateStr };
                saveData(allData);
                return interaction.reply({ 
                    content: `✅ O aniversário de **${user.username}** foi atualizado para **${dateStr}**!`, 
                    ephemeral: true 
                });
            } else {
                guildUsers.push({ id: user.id, name: user.username, date: dateStr });
                saveData(allData);
                return interaction.reply({ 
                    content: `✅ Aniversário de **${user.username}** adicionado para o dia **${dateStr}**!`, 
                    ephemeral: true 
                });
            }
        } 
        
        else if (subcommand === 'listar') {
            const guildUsers = allData[guildId].users;

            if (guildUsers.length === 0) {
                return interaction.reply({ content: 'Nenhum aniversário cadastrado neste servidor.', ephemeral: true });
            }

            // Sort
            guildUsers.sort((a, b) => {
                const [dayA, monthA] = a.date.split('/').map(Number);
                const [dayB, monthB] = b.date.split('/').map(Number);
                if (monthA !== monthB) return monthA - monthB;
                return dayA - dayB;
            });

            const description = guildUsers.map(b => {
                const isSnowflake = /^\d+$/.test(b.id);
                const mention = isSnowflake ? `<@${b.id}>` : `**${b.name}**`;
                return `**${b.date}** - ${mention}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`📅 Aniversariantes: ${interaction.guild.name}`)
                .setDescription(description)
                .setColor('#FF69B4')
                .setFooter({ text: `Total: ${guildUsers.length} aniversariantes` });

            return interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};
