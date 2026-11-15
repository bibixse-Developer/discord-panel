const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

// GANTI DENGAN TOKEN BARU SETELAH RESET TOKEN!
const BOT_TOKEN = 'TOKEN_BOT_BARU_ANDA';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Wajib aktif di Developer Portal agar bisa cari username
        GatewayIntentBits.GuildMessages
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot aktif sebagai ${client.user.tag}`);
    console.log(`🌐 Web server berjalan di http://localhost:3000`);
});

// 1. Endpoint untuk mengambil daftar Server & Channel yang di-join bot
app.get('/api/guilds', (req, res) => {
    const guildsData = client.guilds.cache.map(guild => {
        const textChannels = guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => ({ id: ch.id, name: ch.name }));

        return {
            id: guild.id,
            name: guild.name,
            channels: textChannels
        };
    });
    res.json(guildsData);
});

// 2. Endpoint untuk mengirim pesan & otomatis mengubah @username / @role menjadi tag asli
app.post('/api/send', async (req, res) => {
    const { guildId, channelId, message, embedTitle, embedDesc, embedColor } = req.body;

    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        
        // Ambil semua member & role di server tersebut untuk dicocokkan namanya
        const members = await guild.members.fetch();
        const roles = await guild.roles.fetch();

        let formattedMessage = message || '';

        // Cari pola @nama di pesan dan ubah menjadi <@ID> atau <@&ID>
        formattedMessage = formattedMessage.replace(/@([a-zA-Z0-9_.-]+)/g, (match, name) => {
            const lowerName = name.toLowerCase();

            // Cek kecocokan dengan username atau nickname member
            const foundMember = members.find(m => 
                m.user.username.toLowerCase() === lowerName || 
                (m.nickname && m.nickname.toLowerCase() === lowerName)
            );
            if (foundMember) return `<@${foundMember.id}>`;

            // Cek kecocokan dengan nama role
            const foundRole = roles.find(r => r.name.toLowerCase() === lowerName);
            if (foundRole) return `<@&${foundRole.id}>`;

            // Jika tidak ditemukan, biarkan sebagai teks biasa
            return match;
        });

        const payload = {};
        if (formattedMessage.trim() !== '') payload.content = formattedMessage;

        if ((embedTitle && embedTitle.trim() !== '') || (embedDesc && embedDesc.trim() !== '')) {
            payload.embeds = [{
                title: embedTitle || undefined,
                description: embedDesc || undefined,
                color: parseInt((embedColor || '#5865f2').replace('#', ''), 16)
            }];
        }

        await channel.send(payload);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

client.login(BOT_TOKEN);
app.listen(3000);
