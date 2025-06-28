import moment from 'moment-timezone';

const handler = {};

handler.name = 'liststore';
handler.aliases = ['list'];
handler.description = 'Menampilkan semua item di list store grup.';
handler.tags = ['group'];
handler.groupOnly = true;

handler.execute = async ({ m, db }) => {
    if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');

    const chatData = db.initChat(m.chat);
    const items = Object.keys(chatData.listStr);

    if (items.length === 0) {
        return m.reply('Tidak ada item *list store* di grup ini.');
    }

    const groupName = m.metadata.subject;
    let caption = `Daftar List Store di Grup *${groupName}*\n\n`;
    items.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
         .forEach((item, index) => {
        caption += `*${index + 1}.* ${item}\n`;
    });

    await m.reply(caption.trim());
};

export default handler;