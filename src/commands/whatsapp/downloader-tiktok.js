import axios from 'axios';
import config from '../../config.js';
import { Validator, ErrorHandler } from '../../lib/utils.js';
import { logger } from '../../lib/logger.js';

const handler = {};

handler.name = 'tiktok';
handler.aliases = ['tt', 'ttdl', 'tiktokdl', 'tiktoknowm'];
handler.description = 'Mengunduh video TikTok tanpa watermark.';
handler.tags = ['downloader'];
handler.usage = '<url>';

// Validate arguments
handler.validateArgs = (args) => {
    return args.length > 0 && Validator.isValidTikTokUrl(args[0]);
};

handler.execute = async ({ m, sock, args, usedPrefix, command }) => {
    // Input validation
    if (!args[0]) {
        return m.reply(`✳️ Masukkan tautan TikTok.\n\n📌 Contoh: ${usedPrefix}${command} https://vm.tiktok.com/ZMYG92bUh/`);
    }
    
    if (!Validator.isValidTikTokUrl(args[0])) {
        return m.reply(`❎ URL tidak valid. Pastikan URL berasal dari TikTok.`);
    }
    
    // Check API key
    const apiKey = config.apiKeys?.betabotz;
    if (!apiKey) {
        return m.reply('❎ API Key untuk layanan ini belum diatur oleh pemilik bot.');
    }

    await sock.sendMessage(m.cht, { react: { text: `⏱️`, key: m.key } });

    try {
        logger.info(`TikTok download requested: ${args[0]} by ${m.sender}`);
        
        const response = await axios.get(
            `https://api.betabotz.eu.org/api/download/tiktok`,
            {
                params: {
                    url: args[0],
                    apikey: apiKey
                },
                timeout: 30000 // 30 second timeout
            }
        );
        
        const result = response.data?.result;
        if (!result || !result.video) {
            throw new Error('API tidak mengembalikan hasil yang valid.');
        }

        const caption = `┌─⊷ TIKTOK DOWNLOADER\n` +
                       `▢ *Deskripsi:* ${Validator.sanitizeText(result.title || 'Tidak ada deskripsi')}\n` +
                       `▢ *Durasi:* ${result.duration || 'Tidak diketahui'}\n` +
                       `└───────────`;
        
        await sock.sendFile(m.cht, result.video, 'tiktok.mp4', caption, m);
        await sock.sendMessage(m.cht, { react: { text: `✅`, key: m.key } });
        
        logger.info(`TikTok download successful for ${m.sender}`);

    } catch (error) {
        const userError = ErrorHandler.formatUserError(error, 'TikTok download');
        logger.error('TikTok download failed:', { 
            error: error.message, 
            url: args[0], 
            sender: m.sender 
        });
        
        await sock.sendMessage(m.cht, { react: { text: `❌`, key: m.key } });
        await m.reply(userError);
    }
};

export default handler;