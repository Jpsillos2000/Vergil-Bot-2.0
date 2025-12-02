const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    birthdayChannelId: {
        type: String,
        default: null
    },
    birthdays: [{
        userId: String,
        username: String,
        date: String, // Format: "DD/MM"
        lastCelebratedYear: { type: Number, default: 0 }
    }]
});

module.exports = mongoose.model('Guild', guildSchema);