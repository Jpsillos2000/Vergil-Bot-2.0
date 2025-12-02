const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');

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

        // Fetch or create guild document
        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData) {
            guildData = new Guild({ guildId: guildId, birthdays: [] });
        }

        if (subcommand === 'configurar') {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Você precisa de permissão para gerenciar canais para usar este comando.', ephemeral: true });
            }

            const channel = interaction.options.getChannel('canal');
            
            guildData.birthdayChannelId = channel.id;
            await guildData.save();

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

            const existingIndex = guildData.birthdays.findIndex(b => b.userId === user.id);
            
            if (existingIndex !== -1) {
                guildData.birthdays[existingIndex].date = dateStr;
                guildData.birthdays[existingIndex].username = user.username; // Update name just in case
                await guildData.save();
                return interaction.reply({ 
                    content: `✅ O aniversário de **${user.username}** foi atualizado para **${dateStr}**!`, 
                    ephemeral: true 
                });
            } else {
                guildData.birthdays.push({ userId: user.id, username: user.username, date: dateStr });
                await guildData.save();
                return interaction.reply({ 
                    content: `✅ Aniversário de **${user.username}** adicionado para o dia **${dateStr}**!`, 
                    ephemeral: true 
                });
            }
        } 
        
        else if (subcommand === 'listar') {
            const birthdays = guildData.birthdays;

            if (birthdays.length === 0) {
                return interaction.reply({ content: 'Nenhum aniversário cadastrado neste servidor.', ephemeral: true });
            }

            // Sort
            birthdays.sort((a, b) => {
                const [dayA, monthA] = a.date.split('/').map(Number);
                const [dayB, monthB] = b.date.split('/').map(Number);
                if (monthA !== monthB) return monthA - monthB;
                return dayA - dayB;
            });

            const description = birthdays.map(b => {
                const isSnowflake = /^\d+$/.test(b.userId);
                const mention = isSnowflake ? `<@${b.userId}>` : `**${b.username}**`;
                return `**${b.date}** - ${mention}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`📅 Aniversariantes: ${interaction.guild.name}`)
                .setDescription(description)
                .setColor('#FF69B4')
                .setFooter({ text: `Total: ${birthdays.length} aniversariantes` });

            return interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};
