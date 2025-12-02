const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const path = require('node:path');

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

            let personIndex = guildData.birthdays.findIndex(b => b.userId === user.id);
            let isNew = false;
            
            if (personIndex !== -1) {
                guildData.birthdays[personIndex].date = dateStr;
                guildData.birthdays[personIndex].username = user.username;
                // Reset celebrated year if date changed, to allow celebration if it's today
                guildData.birthdays[personIndex].lastCelebratedYear = 0; 
            } else {
                guildData.birthdays.push({ userId: user.id, username: user.username, date: dateStr, lastCelebratedYear: 0 });
                personIndex = guildData.birthdays.length - 1;
                isNew = true;
            }

            // Immediate Check: Is it today?
            const now = new Date();
            const today = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const currentYear = now.getFullYear();
            let celebratedNow = false;

            if (dateStr === today) {
                const channelId = guildData.birthdayChannelId;
                if (channelId) {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (channel && channel.isTextBased()) {
                        try {
                            const embed = new EmbedBuilder()
                                .setTitle('🎉 Feliz Aniversário! 🎉')
                                .setDescription(`Parabéns, <@${user.id}>! 🎂\nHoje é o seu dia! Que você tenha um dia maravilhoso cheio de alegria!`)
                                .setColor('#FF69B4')
                                .setImage('attachment://birthday.gif')
                                .setFooter({ text: 'Parabéns do Vergil Bot!' });

                            await channel.send({ 
                                content: `Parabéns <@${user.id}>! 🎈`, 
                                embeds: [embed],
                                files: [path.join(__dirname, '../../../assets/images/birthday.gif')]
                            });
                            
                            guildData.birthdays[personIndex].lastCelebratedYear = currentYear;
                            celebratedNow = true;
                        } catch (err) {
                            console.error('Error sending immediate birthday message:', err);
                        }
                    }
                }
            }

            await guildData.save();

            let replyMsg = isNew 
                ? `✅ Aniversário de **${user.username}** adicionado para o dia **${dateStr}**!`
                : `✅ O aniversário de **${user.username}** foi atualizado para **${dateStr}**!`;
            
            if (celebratedNow) {
                replyMsg += "\n🎉 **E como é hoje, já mandei os parabéns!**";
            } else if (dateStr === today && !guildData.birthdayChannelId) {
                replyMsg += "\n⚠️ **É hoje!** Mas não mandei mensagem porque o canal de avisos não está configurado (`/aniversario configurar`).";
            }

            return interaction.reply({ content: replyMsg, ephemeral: true });
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
