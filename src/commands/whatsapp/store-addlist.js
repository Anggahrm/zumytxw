import { uploadImage } from '../../lib/uploadImage.js';

const handler = {};

handler.name = 'addlist';
handler.aliases = ['addlist'];
handler.description = 'Menambah item ke list store grup.';
handler.tags = ['group'];
handler.groupOnly = true;
handler.adminOnly = true;

handler.execute = async ({ m, db, text }) => {
    if (!m.isGroup) {
        return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');
    }
    if (!m.quoted) {
        return m.reply('Balas sebuah pesan dengan `!addlist <nama_item>`');
    }
    if (!text) {
        return m.reply('*Contoh:*\n!addlist nama_keren');
    }

    const key = text.toUpperCase();
    const chatData = db.initChat(m.chat);

    if (key in chatData.listStr) {
        return m.reply(`'${text}' sudah ada di dalam List Store.`);
    }

    let storeValue = {};
    if (m.quoted.isMedia) {
        const media = await m.quoted.download();
        const link = await uploadImage(media);
        storeValue.image = link;
        storeValue.text = m.quoted.text || '';
    } else {
        storeValue.text = m.quoted.body || '';
    }

    chatData.listStr[key] = storeValue;
    db.save();
    await m.reply(`Berhasil menambahkan "${text}" ke List Store.\n\nAkses dengan mengetik namanya.`);
};

export default handler;