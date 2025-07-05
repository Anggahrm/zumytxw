import { Utils } from '../../lib/utils.js';

const handler = {};

handler.name = 'status';
handler.aliases = ['info', 'bot'];
handler.description = 'Menampilkan status dan informasi bot.';
handler.tags = ['main'];

handler.execute = async ({ m, db }) => {
    const uptime = process.uptime() * 1000;
    const formattedUptime = Utils.formatUptime(uptime);
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    const statusText = `╭─「 *📊 BOT STATUS* 」
│ 
│ ⏰ *Uptime:* ${formattedUptime}
│ 💾 *Memory:* ${memoryUsedMB} MB
│ 💭 *Total Grup:* ${Object.keys(db.data.chats).length}
│ 👥 *Total Pengguna:* ${Object.keys(db.data.users).length}
│ 🔥 *Node.js:* ${process.version}
│ 🖥️ *Platform:* ${process.platform}
│ 
╰────────────────`;
    
    await m.reply(statusText);
};

export default handler;