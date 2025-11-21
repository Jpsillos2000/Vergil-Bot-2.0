const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        const rudneyVariations = ['rudney', 'rudine', 'rudinei', 'rodney', 'rodinei'];
        const includesRudney = rudneyVariations.some(variation => content.includes(variation));

        if (includesRudney) {
            await message.reply('Muito gay kkkkk');
        }
    },
};
