import axios from 'axios';
import config from '../../config.js';

const handler = {};

handler.name = 'tiktok';
handler.aliases = ['tt', 'ttdl', 'tiktokdl', 'tiktoknowm'];
handler.description = 'Mengunduh video TikTok tanpa watermark.';
handler.tags = ['downloader'];
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt)$/i;

handler.execute = async ({ m, sock, text, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`✳️ Masukkan tautan TikTok.\n\n 📌 Contoh: ${usedPrefix}${command} https://vm.tiktok.com/ZMYG92bUh/`);
    }
    if (!args[0].match(/tiktok/gi)) {
        return m.reply(`❎ Verifikasi bahwa tautan tersebut berasal dari TikTok.`);
    }
    
    await sock.sendMessage(m.cht, { react: { text: `⏱️`, key: m.key } });

    try {
        const apiKey = config.apiKeys?.betabotz;
        if (!apiKey) {
            return m.reply('❎ API Key untuk layanan ini belum diatur oleh pemilik bot.');
        }

        const res = await axios.get(`https://api.betabotz.eu.org/api/download/tiktok?url=${args[0]}&apikey=${apiKey}`);
        
        const result = res.data.result;
        if (!result || !result.video) {
            throw new Error('API tidak mengembalikan hasil yang valid.');
        }

        const caption = `┌─⊷ TIKTOK\n▢ *Deskripsi:* ${result.title}\n└───────────`;
        
        await sock.sendFile(m.cht, result.video, 'tiktok.mp4', caption, m);
        
        await sock.sendMessage(m.cht, { react: { text: `✅`, key: m.key } });

    } catch (error) {
        console.error('Error in TikTok command:', error);
        await sock.sendMessage(m.cht, { react: { text: `❌`, key: m.key } });
        m.reply(`❎ Terjadi kesalahan saat mengunduh video. Mungkin tautannya tidak valid atau API sedang bermasalah.`);
    }
};

export default handler;