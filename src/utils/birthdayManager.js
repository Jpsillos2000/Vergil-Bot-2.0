const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    UserSelectMenuBuilder, 
    StringSelectMenuBuilder, 
    ChannelSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ComponentType,
    ChannelType
} = require('discord.js');
const Guild = require('../models/Guild');
const path = require('path');

// Helper to generate the main dashboard embed and buttons
// Now supports pagination and 'Edit Mode' state
async function getBirthdayDashboard(guildId, guildName, statusMessage = null, page = 0, isEditMode = false) {
    let guildData = await Guild.findOne({ guildId: guildId });
    if (!guildData) {
        guildData = new Guild({ guildId: guildId, birthdays: [] });
        await guildData.save();
    }

    const birthdays = guildData.birthdays;
    
    // Pagination Settings
    const itemsPerPage = 9;
    const totalPages = Math.ceil(birthdays.length / itemsPerPage) || 1;
    
    // Ensure page is within bounds
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    let description = "Nenhum aniversário cadastrado.";

    if (birthdays.length > 0) {
        // Sort by date
        const sorted = [...birthdays].sort((a, b) => {
            const [dayA, monthA] = a.date.split('/').map(Number);
            const [dayB, monthB] = b.date.split('/').map(Number);
            if (monthA !== monthB) return monthA - monthB;
            return dayA - dayB;
        });

        // Slice for pagination
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = sorted.slice(start, end);

        description = pageItems.map(b => {
            const isSnowflake = /^\d+$/.test(b.userId);
            const mention = isSnowflake ? `<@${b.userId}>` : `**${b.username}**`;
            return `**${b.date}** - ${mention}`;
        }).join('\n');
    }

    const embed = new EmbedBuilder()
        .setTitle(`📅 Aniversariantes: ${guildName}`)
        .setDescription(description)
        .setColor('#FF69B4')
        .setFooter({
            text: `Página ${page + 1}/${totalPages} • Canal: ${guildData.birthdayChannelId ? `<#${guildData.birthdayChannelId}>` : 'Não configurado'}` 
        });
    
    if (statusMessage) {
        embed.addFields({ name: 'Última Atualização', value: statusMessage });
    }

    const components = [];

    // --- Row 1: Pagination & Mode Toggle ---
    const navRow = new ActionRowBuilder();
    
    // Previous Button
    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`aniversario_nav_prev_${page}_${isEditMode ? 1 : 0}`)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0)
    );

    // Mode Toggle (Central Button)
    if (isEditMode) {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`aniversario_mode_view_${page}`)
                .setLabel('Voltar para Visualização')
                .setStyle(ButtonStyle.Secondary)
        );
    } else {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`aniversario_mode_edit_${page}`)
                .setLabel('Gerenciar / Editar')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️')
        );
    }

    // Next Button
    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`aniversario_nav_next_${page}_${isEditMode ? 1 : 0}`)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );

    components.push(navRow);

    // --- Row 2: Action Buttons (Only if in Edit Mode) ---
    if (isEditMode) {
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aniversario_btn_add_${page}`)
                .setLabel('Adicionar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId(`aniversario_btn_remove_${page}`)
                .setLabel('Remover')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖'),
            new ButtonBuilder()
                .setCustomId(`aniversario_btn_config_${page}`)
                .setLabel('Configurar Canal')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚙️')
        );
        components.push(actionRow);
    }

    return { embeds: [embed], components: components };
}

// Helper to delete the old dashboard and send a new one
async function repostDashboard(interaction, oldMessageId, dashboardData) {
    try {
        const channel = interaction.channel;
        if (!channel) return;

        try {
            const oldMsg = await channel.messages.fetch(oldMessageId);
            if (oldMsg) await oldMsg.delete();
        } catch (err) {
            // Ignore
        }
        await channel.send(dashboardData);
    } catch (error) {
        console.error("Error reposting dashboard:", error);
    }
}

async function handleInteraction(interaction) {
    const { customId, guildId, guild } = interaction;

    // --- Navigation: Previous ---
    if (customId.startsWith('aniversario_nav_prev_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const isEditMode = parts.pop() === '1';
        const currentPage = parseInt(parts.pop());
        
        const dashboard = await getBirthdayDashboard(guildId, guild.name, null, currentPage - 1, isEditMode);
        await interaction.editReply(dashboard);
    }

    // --- Navigation: Next ---
    else if (customId.startsWith('aniversario_nav_next_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const isEditMode = parts.pop() === '1';
        const currentPage = parseInt(parts.pop());
        
        const dashboard = await getBirthdayDashboard(guildId, guild.name, null, currentPage + 1, isEditMode);
        await interaction.editReply(dashboard);
    }

    // --- Mode: Switch to Edit ---
    else if (customId.startsWith('aniversario_mode_edit_')) {
        await interaction.deferUpdate();
        const currentPage = parseInt(customId.split('_').pop());
        const dashboard = await getBirthdayDashboard(guildId, guild.name, null, currentPage, true);
        await interaction.editReply(dashboard);
    }

    // --- Mode: Switch to View ---
    else if (customId.startsWith('aniversario_mode_view_')) {
        await interaction.deferUpdate();
        const currentPage = parseInt(customId.split('_').pop());
        const dashboard = await getBirthdayDashboard(guildId, guild.name, null, currentPage, false);
        await interaction.editReply(dashboard);
    }

    // --- Button: Add ---
    else if (customId.startsWith('aniversario_btn_add')) {
        const page = customId.split('_').pop(); 
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId(`aniversario_sel_add_user_${interaction.message.id}_${page}`)
            .setPlaceholder('Selecione o usuário para adicionar');

        const row = new ActionRowBuilder().addComponents(userSelect);

        await interaction.reply({
            content: 'Selecione o usuário que deseja adicionar:', 
            components: [row], 
            ephemeral: true 
        });
    }

    // --- Button: Remove ---
    else if (customId.startsWith('aniversario_btn_remove')) {
        await interaction.deferReply({ ephemeral: true });
        
        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData || !guildData.birthdays || guildData.birthdays.length === 0) {
            return interaction.editReply({ content: 'Não há aniversários para remover.' });
        }

        // Sort for options: by month, then by day
        const sorted = [...guildData.birthdays].sort((a, b) => {
            const [dayA, monthA] = a.date.split('/').map(Number);
            const [dayB, monthB] = b.date.split('/').map(Number);
            if (monthA !== monthB) return monthA - monthB; 
            return dayA - dayB; 
        });

        // Create options (max 25)
        const options = sorted.slice(0, 25).map(b => ({
            label: `${b.username} (${b.date})`,
            value: b.userId,
            description: `ID: ${b.userId}`
        }));

        const page = customId.split('_').pop();
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`aniversario_sel_rm_user_${interaction.message.id}_${page}`)
            .setPlaceholder('Selecione o usuário para remover')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: 'Selecione o usuário que deseja remover:', 
            components: [row]
        });
    }

    // --- Button: Config ---
    else if (customId.startsWith('aniversario_btn_config')) {
        const page = customId.split('_').pop();
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`aniversario_sel_channel_${interaction.message.id}_${page}`)
            .setPlaceholder('Selecione o canal de avisos')
            .addChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.reply({
            content: 'Selecione o canal onde os avisos serão enviados:', 
            components: [row], 
            ephemeral: true 
        });
    }

    // --- Select: Add User (Shows Modal) ---
    else if (customId.startsWith('aniversario_sel_add_user_')) {
        const parts = customId.split('_');
        const page = parts.pop();
        const messageId = parts.pop();
        const userId = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`aniversario_modal_add_${userId}_${messageId}_${page}`)
            .setTitle('Adicionar Aniversário');

        const dateInput = new TextInputBuilder()
            .setCustomId('dateInput')
            .setLabel("Data do Aniversário (DD/MM)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 25/12')
            .setMinLength(5)
            .setMaxLength(5)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(dateInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    // --- Select: Remove User ---
    else if (customId.startsWith('aniversario_sel_rm_user_')) {
        await interaction.deferUpdate();
        
        const parts = customId.split('_');
        const page = parts.pop(); 
        const messageId = parts.pop();
        const userIdToRemove = interaction.values[0];
        
        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData) return interaction.editReply({ content: 'Erro: BD não encontrado.', components: [] });

        const initialLength = guildData.birthdays.length;
        guildData.birthdays = guildData.birthdays.filter(b => b.userId !== userIdToRemove);

        if (guildData.birthdays.length < initialLength) {
            await guildData.save();
            
            // Prepare new dashboard (Reset to page 0 or try to keep page? Reset is easier to avoid empty pages)
            const dashboard = await getBirthdayDashboard(guildId, guild.name, `✅ Aniversário removido com sucesso!`, 0, true);
            await repostDashboard(interaction, messageId, dashboard);

            await interaction.editReply({ content: '✅ Usuário removido! (Painel atualizado abaixo)', components: [] });
        } else {
            await interaction.editReply({ content: `❌ Usuário não encontrado na lista.`, components: [] });
        }
    }

    // --- Select: Config Channel ---
    else if (customId.startsWith('aniversario_sel_channel_')) {
        await interaction.deferUpdate();

        const parts = customId.split('_');
        const page = parseInt(parts.pop());
        const messageId = parts.pop();
        const channelId = interaction.values[0];

        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData) guildData = new Guild({ guildId: guildId, birthdays: [] });
        
        guildData.birthdayChannelId = channelId;
        await guildData.save();

        // Keep same page, keep Edit mode
        const dashboard = await getBirthdayDashboard(guildId, guild.name, `✅ Canal configurado para <#${channelId}>!`, page, true);
        await repostDashboard(interaction, messageId, dashboard);

        await interaction.editReply({ content: `✅ Canal configurado! (Painel atualizado abaixo)`, components: [] });
    }

    // --- Modal Submit: Add ---
    else if (customId.startsWith('aniversario_modal_add_')) {
        // Important: We cannot use deferReply here because we want to potentially show an error as a reply or update the dashboard.
        // But since DB ops take time, and Modal Interactions expire in 3s, we MUST acknowledge quickly.
        // However, updating the dashboard involves deleting and sending a NEW message, which is async.
        // Strategy: Defer update immediately. If error, use followUp.
        
        await interaction.deferUpdate();

        const parts = customId.split('_');
        const page = parseInt(parts.pop()); 
        const messageId = parts.pop();
        const targetUserId = parts.pop();
        const dateStr = interaction.fields.getTextInputValue('dateInput');

        // Validation
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
        if (!dateRegex.test(dateStr)) {
            // Since we deferred update, we can't reply ephemeral normally. We have to follow up ephemeral.
            return interaction.followUp({ content: '❌ Formato de data inválido! Use DD/MM.', ephemeral: true });
        }

        let guildData = await Guild.findOne({ guildId: guildId });
        if (!guildData) guildData = new Guild({ guildId: guildId, birthdays: [] });

        let targetUser;
        try {
            targetUser = await interaction.guild.members.fetch(targetUserId);
        } catch (e) {
            targetUser = { user: { username: 'Desconhecido', id: targetUserId } };
        }
        const username = targetUser.user ? targetUser.user.username : 'Desconhecido';

        // Update or Add
        const index = guildData.birthdays.findIndex(b => b.userId === targetUserId);
        if (index !== -1) {
            guildData.birthdays[index].date = dateStr;
            guildData.birthdays[index].username = username;
            guildData.birthdays[index].lastCelebratedYear = 0;
        } else {
            guildData.birthdays.push({ userId: targetUserId, username: username, date: dateStr, lastCelebratedYear: 0 });
        }

        // Check immediate celebration
        const now = new Date();
        const today = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
        const currentYear = parseInt(now.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' }));
        let celebratedNow = false;

        if (dateStr === today) {
            const channelId = guildData.birthdayChannelId;
            if (channelId) {
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel && channel.isTextBased()) {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('🎉 Feliz Aniversário! 🎉')
                            .setDescription(`Parabéns, <@${targetUserId}>! 🎂\nHoje é o seu dia! Que você tenha um dia maravilhoso cheio de alegria!`)
                            .setColor('#FF69B4')
                            .setImage('attachment://birthday.gif')
                            .setFooter({ text: 'Parabéns do Vergil Bot!' });

                        await channel.send({
                            content: `Parabéns <@${targetUserId}>! 🎈`,
                            embeds: [embed],
                            files: [path.join(__dirname, '../../assets/images/birthday.gif')]
                        });
                        
                        const pIndex = guildData.birthdays.findIndex(b => b.userId === targetUserId);
                        if (pIndex !== -1) guildData.birthdays[pIndex].lastCelebratedYear = currentYear;
                        celebratedNow = true;
                    } catch (err) {
                        console.error('Error sending immediate birthday message:', err);
                    }
                }
            }
        }

        await guildData.save();

        let statusMsg = `✅ Aniversário de **${username}** definido para **${dateStr}**!`;
        if (celebratedNow) statusMsg += "\n🎉 **E como é hoje, já mandei os parabéns!**";
        else if (dateStr === today && !guildData.birthdayChannelId) statusMsg += "\n⚠️ **É hoje!** Sem canal configurado.";

        // Repost dashboard
        const dashboard = await getBirthdayDashboard(guildId, guild.name, statusMsg, 0, true);
        await repostDashboard(interaction, messageId, dashboard);
    }
}

module.exports = { getBirthdayDashboard, handleInteraction };
