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
						
						// Try to find the user in all guilds the bot is in
						for (const guild of client.guilds.cache.values()) {
							try {
								// Fetch member to ensure they are in the guild
								const member = await guild.members.fetch(person.id).catch(() => null);
								if (member) {
									// Target specific channel ID: 645698417544265769
									const channel = guild.channels.cache.get('645698417544265769');

									if (channel) {
										const embed = new EmbedBuilder()
											.setTitle('🎉 Feliz Aniversário! 🎉')
											.setDescription(`Parabéns, <@${person.id}>! 🎂\nHoje é o seu dia! Que você tenha um dia maravilhoso cheio de alegria!`)
											.setColor('#FF69B4')
											.setFooter({ text: 'Parabéns do Vergil Bot!' });

										// Sending content with the GIF link ensures it renders in Discord
										await channel.send({ 
											content: `Parabéns <@${person.id}>! 🎈\nhttps://tenor.com/view/happy-birthday-happy-birthday-wishes-birthday-wishes-cake-birthday-gif-12993370231673496431`, 
											embeds: [embed] 
										});
										
										console.log(`Celebrated birthday for ${person.name} (${person.id}) in ${guild.name}`);
										celebrated.add(person.id);
										break; // Stop searching guilds for this user once celebrated
									}
								}
							} catch (err) {
								console.error(`Error processing birthday for ${person.id} in guild ${guild.id}:`, err);
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