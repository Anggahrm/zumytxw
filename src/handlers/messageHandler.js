import { logger } from '../lib/logger.js';
import { rateLimiter, ErrorHandler, Validator } from '../lib/utils.js';
import { getWhatsAppDatabase } from '../lib/database.js';
import { getCommand } from './commandHandler.js';

/**
 * Handle incoming WhatsApp messages
 * @param {Object} m - Serialized message object
 * @param {Object} sock - WhatsApp socket instance
 */
export async function handleMessages(m, sock) {
    try {
        // Skip if no prefix or invalid message
        if (!m.prefix || m.isBot || !m.command) return;

        // Rate limiting check
        if (!rateLimiter.isWithinLimit(m.sender, 'user')) {
            return m.reply('⚠️ Anda mengirim perintah terlalu cepat. Tunggu sebentar sebelum mencoba lagi.');
        }

        const db = getWhatsAppDatabase(sock.user.id.split(':')[0]);
        const cmd = getCommand(m.command.toLowerCase());

        if (cmd) {
            // Validate command permissions
            if (cmd.groupOnly && !m.isGroup) {
                return m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup!');
            }
            if (cmd.adminOnly && m.isGroup && !m.isAdmin) {
                return m.reply('❌ Perintah ini hanya untuk admin grup!');
            }

            // Validate arguments if command has validation
            if (cmd.validateArgs && !cmd.validateArgs(m.args)) {
                return m.reply(`❌ Format perintah salah. Gunakan: ${m.prefix}${cmd.name} ${cmd.usage || ''}`);
            }

            // Execute command with error handling
            await ErrorHandler.asyncWrapper(cmd.execute, `command:${cmd.name}`)({
                m,
                sock,
                db,
                text: Validator.sanitizeText(m.text),
                args: m.args.map(arg => Validator.sanitizeText(arg)),
                usedPrefix: m.prefix, 
                command: m.command
            });

            logger.info(`Command executed: ${m.command} by ${m.sender}`);
        } else {
            // Handle store list items
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
                logger.debug(`Store item accessed: ${m.body} by ${m.sender}`);
            }
        }

    } catch (error) {
        const userError = ErrorHandler.formatUserError(error, 'message processing');
        logger.error('Error processing message:', { 
            error: error.message, 
            sender: m.sender, 
            command: m.command 
        });
        await m.reply(userError);
    }
}