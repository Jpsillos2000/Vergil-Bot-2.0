const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        if (oldState.id !== oldState.client.user.id) {
            return;
        }

        if (oldState.channelId && !newState.channelId) {
            const playerInstance = oldState.client.playerInstances.get(oldState.guild.id);

            if (playerInstance) {
                console.log(`Bot disconnected from voice in guild ${oldState.guild.id}. Cleaning up.`);
                
                playerInstance.queue = []; 
                playerInstance.player.stop();
                
                playerInstance.message.edit({ content: '👋 I was disconnected. The queue has been cleared and playback has ended.', components: [], embeds: [], files: [] }).catch(console.error);
            }
        }
    }
};
