const { Events, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Keep track of users celebrated today to avoid spamming on restarts or repeated checks
const celebrated = new Set();
let lastCheckDate = '';

module.exports = {
	name: Events.ClientReady,
	once: true, // The event listener is registered once, but the interval continues
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const checkBirthdays = async () => {
			const now = new Date();
			const today = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // DD/MM

			// Reset the celebrated list if it's a new day
			if (today !== lastCheckDate) {
				celebrated.clear();
				lastCheckDate = today;
			}

			const filePath = path.join(__dirname, '../data/birthdays.json');
			if (!fs.existsSync(filePath)) {
				console.log('Birthdays file not found at:', filePath);
				return;
			}

			try {
				const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

				for (const person of data) {
					// Check if date matches and user hasn't been celebrated today
					if (person.date === today && !celebrated.has(person.id)) {
						
						// Try to find the target channel in all guilds (since Channel ID is unique globally usually)
						for (const guild of client.guilds.cache.values()) {
							const channel = guild.channels.cache.get('645698417544265769');

							if (channel) {
								const isSnowflake = /^\d+$/.test(person.id);
								let mentionString = `**${person.name}**`; // Default to bold name
								let shouldSend = true;

								if (isSnowflake) {
									// If it's a Discord ID, verify membership to avoid spamming non-members (optional, but good practice)
									// Or we can just tag them blindly. 
									// Let's check if they are in the guild to be safe/polite
									try {
										const member = await guild.members.fetch(person.id).catch(() => null);
										if (member) {
											mentionString = `<@${person.id}>`;
										} else {
											// If user not in guild, maybe don't announce? Or announce by name?
											// Let's announce by name if they aren't there, or just skip? 
											// User asked for a list of names, likely active people.
											// We'll stick to the mention if it's an ID, even if fetch fails (it will just look like <@ID>)
											// or fallback to name.
											// Let's use the name if fetch fails to ensure it looks nice.
											mentionString = `**${person.name}**`; 
										}
									} catch (e) {
										mentionString = `**${person.name}**`;
									}
								}

								// Construct the message
								const embed = new EmbedBuilder()
									.setTitle('🎉 Feliz Aniversário! 🎉')
									.setDescription(`Parabéns, ${mentionString}! 🎂\nHoje é o seu dia! Que você tenha um dia maravilhoso cheio de alegria!`)
									.setColor('#FF69B4')
									.setImage('https://media.tenor.com/images/12993370231673496431/tenor.gif') // Direct GIF link
									.setFooter({ text: 'Parabéns do Vergil Bot!' });

								await channel.send({ 
									content: `Parabéns ${mentionString}! 🎈`, // Remove GIF link from content
									embeds: [embed] 
								});
								
								console.log(`Celebrated birthday for ${person.name} (${person.id}) in ${guild.name}`);
								celebrated.add(person.id);
								break; // Stop searching guilds for this user once celebrated (channel ID is unique)
							}
						}
					}
				}
			} catch (err) {
				console.error('Error reading or parsing birthdays.json:', err);
			}
		};

		// Run check immediately on startup
		checkBirthdays();

		// Schedule check every hour (to catch if the bot was down during the exact time, or if date changes)
		setInterval(checkBirthdays, 60 * 60 * 1000);
	},
};