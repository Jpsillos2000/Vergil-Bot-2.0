const { Events, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const Guild = require('../models/Guild');

let lastCheckDate = '';

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const checkBirthdays = async () => {
			const now = new Date();
			const today = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // DD/MM
			const currentYear = now.getFullYear();

			if (today !== lastCheckDate) {
				lastCheckDate = today;
			}

			try {
				// Fetch all guilds from MongoDB
				const guilds = await Guild.find({});

				for (const guildDoc of guilds) {
					if (!guildDoc.birthdayChannelId) continue;

					const channel = await client.channels.fetch(guildDoc.birthdayChannelId).catch(() => null);
					if (!channel || !channel.isTextBased()) continue;

					let docChanged = false;

					for (const person of guildDoc.birthdays) {
						if (person.date === today && person.lastCelebratedYear !== currentYear) {
							
							const isSnowflake = /^\d+$/.test(person.userId);
							let mentionString = `**${person.username}**`;

							if (isSnowflake) {
								try {
									const member = await channel.guild.members.fetch(person.userId).catch(() => null);
									if (member) {
										mentionString = `<@${person.userId}>`;
									}
								} catch (e) { /* Ignore */ }
							}

							const embed = new EmbedBuilder()
								.setTitle('🎉 Feliz Aniversário! 🎉')
								.setDescription(`Parabéns, ${mentionString}! 🎂\nHoje é o seu dia! Que você tenha um dia maravilhoso cheio de alegria!`)
								.setColor('#FF69B4')
								.setImage('attachment://birthday.gif')
								.setFooter({ text: 'Parabéns do Vergil Bot!' });

							try {
								await channel.send({ 
									content: `Parabéns ${mentionString}! 🎈`, 
									embeds: [embed],
									files: [path.join(__dirname, '../../assets/images/birthday.gif')]
								});
								
								console.log(`Celebrated birthday for ${person.username} in guild ${guildDoc.guildId}`);
								
								person.lastCelebratedYear = currentYear;
								docChanged = true;

							} catch (err) {
								console.error(`Failed to send message in guild ${guildDoc.guildId}:`, err);
							}
						}
					}

					if (docChanged) {
						await guildDoc.save();
					}
				}
			} catch (err) {
				console.error('Error checking birthdays:', err);
			}
		};

		checkBirthdays();
		setInterval(checkBirthdays, 60 * 60 * 1000);
	},
};