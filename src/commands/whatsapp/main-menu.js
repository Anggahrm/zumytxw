// Di dalam file: src/commands/whatsapp/menu.js

import { commands } from '../../handlers/commandHandler.js';
import config from '../../config.js';

const handler = {};

handler.name = 'menu';
handler.aliases = ['help', '?'];
handler.description = 'Menampilkan menu perintah yang tersedia.';
handler.tags = ['main'];

// Terima 'usedPrefix' dari argumen
handler.execute = async ({ m, usedPrefix }) => {
    const groupedCommands = {};

    commands.forEach(cmd => {
        const tag = (cmd.tags && cmd.tags[0]) || 'Lainnya';
        if (!groupedCommands[tag]) {
            groupedCommands[tag] = [];
        }
        groupedCommands[tag].push(cmd);
    });

    let menuText = `╭─「 *${config.whatsapp.botInfo.name}* 」\n`;
    menuText += `│\n│ 👋 Halo, *${m.pushName}*!\n│\n`;

    const sortedCategories = Object.keys(groupedCommands).sort();

    for (const tag of sortedCategories) {
        const commandsToList = groupedCommands[tag].filter(cmd => !(cmd.groupOnly && !m.isGroup));
        
        if (commandsToList.length > 0) {
            const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
            menuText += `├─「 *${formattedTag}* 」\n`;
            commandsToList.forEach(cmd => {
                menuText += `│ • ${usedPrefix}${cmd.name}\n`;
            });
        }
    }
    
    menuText += '│\n';
    menuText += `╰─「 *ZumyNext - MultiDevice* 」`;

    await m.reply(menuText);
};

export default handler;