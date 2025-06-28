import chalk from 'chalk';
import { getWhatsAppDatabase } from '../lib/database.js';
import { getCommand } from './commandHandler.js';

export async function handleMessages(m, sock) {
    try {
        if (!m.prefix) return;

        if (m.isBot || !m.command) return;

        const db = getWhatsAppDatabase(sock.user.id.split(':')[0]);
        const cmd = getCommand(m.command.toLowerCase());

        if (cmd) {
            if (cmd.groupOnly && !m.isGroup) {
                return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');
            }
            if (cmd.adminOnly && m.isGroup && !m.isAdmin) {
                return m.reply('Perintah ini hanya untuk admin grup!');
            }

            await cmd.execute({
                m,
                sock,
                db,
                text: m.text,
                args: m.args,
                usedPrefix: m.prefix, 
                command: m.command
            });
            console.log(chalk.green(`[CMD]`), chalk.yellow(m.command), `from`, chalk.cyan(m.sender));
        } else {
            const chat = db.initChat(m.chat);
            const listStoreItem = chat.listStr[m.body.toUpperCase()];
            if (listStoreItem) {
                 if (listStoreItem.image) {
                    await sock.sendMessage(m.chat, {
                        image: { url: listStoreItem.image },
                        caption: listStoreItem.text || '',
                        mentions: m.mentions
                    });
                } else if (listStoreItem.text) {
                    await sock.sendMessage(m.chat, {
                        text: listStoreItem.text,
                        mentions: m.mentions
                    });
                }
            }
        }

    } catch (error) {
        console.error(chalk.red.bold('Error memproses pesan:'), error);
        await m.reply('Maaf, terjadi kesalahan saat memproses perintah Anda.');
    }
}