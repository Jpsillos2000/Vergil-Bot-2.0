const { SlashCommandBuilder, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

// Placeholder for bot owner ID. Replace with actual owner ID.
const OWNER_ID = 'YOUR_BOT_OWNER_ID'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads commands. (Owner only)'),
    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Clear existing commands
            interaction.client.commands.clear();

            const commands = [];
            const foldersPath = path.join(__dirname, '..'); // Go up to 'commands' directory
            const commandFolders = fs.readdirSync(foldersPath);

            for (const folder of commandFolders) {
                const commandsPath = path.join(foldersPath, folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(filePath)]; // Clear module cache
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        interaction.client.commands.set(command.data.name, command);
                        commands.push(command.data.toJSON()); // For re-deploying to Discord
                    } else {
                        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                }
            }

            // Re-deploy commands to Discord (similar to deployCommands.js)
            const clientId = process.env.CLIENT_ID;
            const guildId = process.env.GUILD_ID;
            const token = process.env.DISCORD_TOKEN;

            const rest = new REST().setToken(token);

            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            
            await interaction.editReply('All commands have been reloaded and re-deployed successfully!');

        } catch (error) {
            console.error(error);
            await interaction.editReply(`There was an error while reloading commands: \n\`\`\`${error.message}\`\`\``);
        }
    },
};