const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Keep track of users celebrated today to avoid spamming on restarts or repeated checks
// Format: "GUILD_ID-USER_ID"
const celebrated = new Set();
let lastCheckDate = '';

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const filePath = path.join(__dirname, '../data/birthdays.json');
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, '{}', 'utf8');
		}

		// MIGRATION LOGIC: Convert legacy array to Guild Object
		try {
			const rawContent = fs.readFileSync(filePath, 'utf8');
			if (rawContent.trim().startsWith('[')) {
				console.log('Legacy birthdays format detected. Attempting migration...');
				const legacyUsers = JSON.parse(rawContent);
				
				// Find the guild that owns the old hardcoded channel
				const legacyChannelId = '645698417544265769';
				let targetGuildId = null;

				// We need to fetch the channel to find its guild
				try {
					const channel = await client.channels.fetch(legacyChannelId).catch(() => null);
					if (channel && channel.guild) {
						targetGuildId = channel.guild.id;
						console.log(`Found legacy channel in guild: ${channel.guild.name} (${targetGuildId})`);
					}
				} catch (err) {
					console.error('Could not fetch legacy channel for migration:', err);
				}

				if (targetGuildId) {
					const newData = {};
					newData[targetGuildId] = {
						channelId: legacyChannelId,
						users: legacyUsers
					};
					fs.writeFileSync(filePath, JSON.stringify(newData, null, 4), 'utf8');
					console.log('Migration successful! Data saved under guild ID:', targetGuildId);
				} else {
					console.warn('Migration failed: Could not determine guild ID. Keeping legacy file (it might not work until fixed).');
				}
			}
		} catch (err) {
			console.error('Error during migration check:', err);
		}

		const checkBirthdays = async () => {
			const now = new Date();
			const today = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // DD/MM

			if (today !== lastCheckDate) {
				celebrated.clear();
				lastCheckDate = today;
			}

			try {
				// Reload data every check to support dynamic updates
				const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

				// Iterate through each Guild ID in the JSON
				for (const guildId of Object.keys(data)) {
					const guildData = data[guildId];
					
					// Skip if no channel configured
					if (!guildData.channelId) continue;

					const channel = await client.channels.fetch(guildData.channelId).catch(() => null);
					if (!channel || !channel.isTextBased()) {
						console.log(`Invalid or missing channel for guild ${guildId}`);
						continue;
					}

					for (const person of guildData.users) {
						const celebrationKey = `${guildId}-${person.id}`;

						if (person.date === today && !celebrated.has(celebrationKey)) {
							const isSnowflake = /^\d+$/.test(person.id);
							let mentionString = `**${person.name}**`;

							if (isSnowflake) {
								try {
									// Try to fetch member to see if they are still in the server
									const member = await channel.guild.members.fetch(person.id).catch(() => null);
									if (member) {
										mentionString = `<@${person.id}>`;
									}
								} catch (e) { /* Ignore fetch errors */ }
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
								
								console.log(`Celebrated birthday for ${person.name} in guild ${guildId}`);
								celebrated.add(celebrationKey);
							} catch (err) {
								console.error(`Failed to send message in guild ${guildId}:`, err);
							}
						}
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