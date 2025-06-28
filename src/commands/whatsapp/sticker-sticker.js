import { writeExif } from '../../lib/sticker.js';

const handler = {};

handler.name = 'sticker';
handler.aliases = ['s'];
handler.description = 'Membuat stiker dari gambar atau video.';
handler.tags = ['sticker'];

handler.execute = async ({ m, sock }) => {
    if (!m.quoted || !m.quoted.isMedia) {
        return m.reply('> Balas gambar atau video untuk dijadikan stiker.');
    }
    if (m.quoted.msg.mimetype.startsWith('video/') && m.quoted.msg.seconds > 10) {
        return m.reply('> Video tidak boleh lebih dari 10 detik!');
    }

    await m.reply('⏳ Sedang membuat stiker...');

    try {
        const media = await m.quoted.download();
        const sticker = await writeExif(
            { mimetype: m.quoted.msg.mimetype, data: media },
            { packName: 'Bot Keren', packPublish: 'Oleh Saya' }
        );
        await sock.sendMessage(m.chat, { sticker });
    } catch (error) {
        console.error('Error in sticker command:', error);
        await m.reply('❌ Gagal membuat stiker. Coba lagi nanti.');
    }
};

export default handler;