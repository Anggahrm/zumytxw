import moment from 'moment-timezone';

const handler = {};

handler.name = 'status';
handler.aliases = [];
handler.description = 'Menampilkan status bot.';
handler.tags = ['main'];

handler.execute = async ({ m, db }) => {
    const uptime = process.uptime() * 1000;
    const formattedUptime = moment.duration(uptime).humanize();
    const statusText = `╭─「 *Status Bot* 」
│ 
│ ⏰ Uptime: ${formattedUptime}
│ 💭 Total Grup: ${Object.keys(db.data.chats).length}
│ 👥 Total Pengguna: ${Object.keys(db.data.users).length}
│ 
╰────`;
    await m.reply(statusText);
};

export default handler;