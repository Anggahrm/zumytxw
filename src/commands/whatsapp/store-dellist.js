const handler = {};

handler.name = 'dellist';
handler.aliases = ['dellist'];
handler.description = 'Menghapus item dari list store grup.';
handler.tags = ['group'];
handler.groupOnly = true;
handler.adminOnly = true;

handler.execute = async ({ m, db, text }) => {
    if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');
    if (!text) return m.reply('*Contoh:*\n!dellist <nama_item>\n\nGunakan !list untuk melihat item yang tersedia.');
    
    const key = text.toUpperCase();
    const chatData = db.initChat(m.chat);

    if (!(key in chatData.listStr)) {
        return m.reply(`'${text}' tidak terdaftar di List Store.`);
    }

    delete chatData.listStr[key];
    db.save();
    await m.reply(`Berhasil menghapus '${text}' dari List Store.`);
};

export default handler;