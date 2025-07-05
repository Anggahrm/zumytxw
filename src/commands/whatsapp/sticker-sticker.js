import { writeExif } from '../../lib/sticker.js';
import { ErrorHandler } from '../../lib/utils.js';
import { logger } from '../../lib/logger.js';
import { DEFAULT_CONFIG, SUPPORTED_MEDIA_TYPES } from '../../lib/constants.js';

const handler = {};

handler.name = 'sticker';
handler.aliases = ['s'];
handler.description = 'Membuat stiker dari gambar atau video.';
handler.tags = ['sticker'];
handler.usage = '(reply to image/video)';

handler.execute = async ({ m, sock }) => {
    try {
        if (!m.quoted || !m.quoted.isMedia) {
            return m.reply('❌ Balas gambar atau video untuk dijadikan stiker.');
        }

        const quotedMime = m.quoted.msg.mimetype || '';
        
        // Validate media type
        const isValidImage = SUPPORTED_MEDIA_TYPES.IMAGE.includes(quotedMime);
        const isValidVideo = SUPPORTED_MEDIA_TYPES.VIDEO.includes(quotedMime);
        
        if (!isValidImage && !isValidVideo) {
            return m.reply('❌ Format tidak didukung. Gunakan gambar (JPG, PNG, WebP) atau video (MP4, WebM).');
        }

        // Check video duration
        if (isValidVideo && m.quoted.msg.seconds > DEFAULT_CONFIG.MAX_VIDEO_DURATION) {
            return m.reply(`❌ Video tidak boleh lebih dari ${DEFAULT_CONFIG.MAX_VIDEO_DURATION} detik!`);
        }

        await m.reply('⏳ Sedang membuat stiker...');

        try {
            const media = await m.quoted.download();
            
            if (!media || media.length === 0) {
                throw new Error('Gagal mengunduh media');
            }

            // Check file size
            if (media.length > DEFAULT_CONFIG.MAX_FILE_SIZE) {
                return m.reply('❌ File terlalu besar. Maksimal 50MB.');
            }

            const sticker = await writeExif(
                { mimetype: quotedMime, data: media },
                { 
                    packName: 'ZumyNext Bot', 
                    packPublish: 'Multi-Device',
                    emojis: ['😊', '😂', '❤️']
                }
            );
            
            await sock.sendMessage(m.chat, { sticker });
            logger.info(`Sticker created for ${m.sender} in ${m.chat}`);
            
        } catch (error) {
            logger.error('Error creating sticker:', error);
            throw error;
        }

    } catch (error) {
        const userError = ErrorHandler.formatUserError(error, 'sticker creation');
        logger.error('Error in sticker command:', { error: error.message, sender: m.sender });
        await m.reply(userError);
    }
};

export default handler;