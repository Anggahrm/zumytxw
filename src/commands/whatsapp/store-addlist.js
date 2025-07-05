import { uploadImage } from '../../lib/uploadImage.js';
import { Validator, ErrorHandler } from '../../lib/utils.js';
import { logger } from '../../lib/logger.js';

const handler = {};

handler.name = 'addlist';
handler.aliases = ['addlist'];
handler.description = 'Menambah item ke list store grup.';
handler.tags = ['group'];
handler.groupOnly = true;
handler.adminOnly = true;
handler.usage = '<nama_item>';

handler.validateArgs = (args) => {
    return args.length > 0 && args[0].length >= 2 && args[0].length <= 50;
};

handler.execute = async ({ m, db, text }) => {
    try {
        if (!m.isGroup) {
            return m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup!');
        }
        
        if (!m.quoted) {
            return m.reply('❌ Balas sebuah pesan dengan `!addlist <nama_item>`');
        }
        
        if (!text) {
            return m.reply('❌ *Format:* !addlist nama_item\n\n*Contoh:* !addlist menu_spesial');
        }

        // Validate and sanitize input
        const sanitizedName = Validator.sanitizeText(text);
        if (!sanitizedName || sanitizedName.length < 2) {
            return m.reply('❌ Nama item tidak valid. Minimal 2 karakter.');
        }

        const key = sanitizedName.toUpperCase();
        const chatData = db.initChat(m.chat);

        if (key in chatData.listStr) {
            return m.reply(`❌ '${sanitizedName}' sudah ada di dalam List Store.`);
        }

        await m.reply('⏳ Memproses item store...');

        let storeValue = {};
        
        if (m.quoted.isMedia) {
            try {
                const media = await m.quoted.download();
                if (!media || media.length === 0) {
                    throw new Error('Gagal mengunduh media');
                }
                
                // Check file size (max 10MB for store items)
                if (media.length > 10 * 1024 * 1024) {
                    return m.reply('❌ File terlalu besar. Maksimal 10MB untuk item store.');
                }
                
                const link = await uploadImage(media);
                storeValue.image = link;
                storeValue.text = Validator.sanitizeText(m.quoted.text || '');
                
                logger.info(`Store item added with image: ${sanitizedName} in ${m.chat}`);
            } catch (error) {
                logger.error('Failed to upload image for store item:', error);
                return m.reply('❌ Gagal mengunggah gambar. Silakan coba lagi.');
            }
        } else {
            const quotedText = m.quoted.body || '';
            if (!quotedText.trim()) {
                return m.reply('❌ Pesan yang dibalas harus berisi teks atau media.');
            }
            
            storeValue.text = Validator.sanitizeText(quotedText);
            logger.info(`Store item added with text: ${sanitizedName} in ${m.chat}`);
        }

        chatData.listStr[key] = storeValue;
        db.save();
        
        await m.reply(`✅ Berhasil menambahkan "*${sanitizedName}*" ke List Store.\n\n📝 Akses dengan mengetik: \`${key}\``);
        
    } catch (error) {
        const userError = ErrorHandler.formatUserError(error, 'add store item');
        logger.error('Error in addlist command:', { error: error.message, chat: m.chat });
        await m.reply(userError);
    }
};

export default handler;