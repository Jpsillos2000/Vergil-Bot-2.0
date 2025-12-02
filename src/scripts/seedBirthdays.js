const mongoose = require('mongoose');
const Guild = require('../models/Guild');
require('dotenv').config();

// --- CONFIGURAÇÃO ---
const TARGET_GUILD_ID = process.env.GUILD_ID || 'SEU_ID_DE_SERVIDOR_AQUI';
const TARGET_CHANNEL_ID = '645698417544265769'; // Canal padrão que você usava

const INITIAL_DATA = [
    { id: "manual_1", name: "Julianaaa", date: "25/02" },
    { id: "manual_2", name: "Calico", date: "08/03" },
    { id: "manual_3", name: "Lukical", date: "21/03" },
    { id: "manual_4", name: "Nath", date: "21/03" },
    { id: "manual_5", name: "Bolsonaro", date: "21/03" },
    { id: "manual_6", name: "Ana", date: "22/04" },
    { id: "manual_7", name: "Gian", date: "29/04" },
    { id: "manual_8", name: "Bia Renata", date: "06/05" },
    { id: "manual_9", name: "Rafa", date: "08/06" },
    { id: "manual_10", name: "Barbie Butterfly", date: "29/06" },
    { id: "manual_11", name: "Ana João Silas", date: "28/07" },
    { id: "manual_12", name: "Rudney", date: "08/08" },
    { id: "manual_13", name: "Padre", date: "23/08" },
    { id: "manual_14", name: "João", date: "04/09" },
    { id: "manual_15", name: "Gabriel", date: "12/09" },
    { id: "manual_16", name: "Thiago", date: "29/09" },
    { id: "manual_17", name: "Luiz Felipe", date: "02/12" },
    { id: "manual_18", name: "Melly", date: "03/12" },
    { id: "manual_19", name: "Galifreio", date: "19/12" },
    { id: "manual_20", name: "Fernando Gostoso da piroca enorme com físico similar ao henry cavill e tão excitante como christian grey", date: "25/12" }
];

const seed = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI não encontrada no .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Conectado ao MongoDB');

        let guild = await Guild.findOne({ guildId: TARGET_GUILD_ID });
        
        if (!guild) {
            console.log(`Criando novo documento para o servidor ${TARGET_GUILD_ID}...`);
            guild = new Guild({
                guildId: TARGET_GUILD_ID,
                birthdayChannelId: TARGET_CHANNEL_ID,
                birthdays: []
            });
        } else {
            console.log(`Atualizando servidor existente ${TARGET_GUILD_ID}...`);
            if (!guild.birthdayChannelId) guild.birthdayChannelId = TARGET_CHANNEL_ID;
        }

        let addedCount = 0;
        for (const person of INITIAL_DATA) {
            // Check for duplicates based on ID or Name to be safe
            const exists = guild.birthdays.some(b => b.userId === person.id || b.username === person.name);
            
            if (!exists) {
                guild.birthdays.push({
                    userId: person.id,
                    username: person.name,
                    date: person.date,
                    lastCelebratedYear: 0
                });
                addedCount++;
            }
        }

        await guild.save();
        console.log(`✅ Sucesso! ${addedCount} novos aniversários adicionados.`);
        console.log('🌱 Seed concluído.');

    } catch (err) {
        console.error('❌ Erro ao rodar seed:', err);
    } finally {
        mongoose.disconnect();
    }
};

seed();