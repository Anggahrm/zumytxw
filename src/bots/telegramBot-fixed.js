import { Telegraf } from 'telegraf';
import config from '../config.js';
import { createWhatsAppBot, deleteSession } from './whatsappBot.js';
import { telegramDb, deleteWhatsAppDatabase } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { Validator, ErrorHandler } from '../lib/utils.js';

const bot = new Telegraf(config.telegram.botToken);
const botStatus = new Map();
const phoneToChatId = new Map();

// Cleanup maps periodically to prevent memory leaks
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    for (const [phone, data] of phoneToChatId.entries()) {
        if (data && data.timestamp && data.timestamp < oneHourAgo) {
            phoneToChatId.delete(phone);
        }
    }
}, 300000); // Clean every 5 minutes

function escapeHTML(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const getUserBotCount = (userId) => telegramDb.getUser(userId).bots.length;
const isDeveloper = (userId) => telegramDb.getUser(userId).role === 'developer';

const canAddMoreBots = (userId) => {
    const user = telegramDb.getUser(userId);
    if (user.role === 'developer') return true;
    const limit = telegramDb.data.roles[user.role]?.limit || 0;
    return getUserBotCount(userId) < limit;
};

export function startTelegramBot(whatsAppBots) {
    logger.info('Starting Telegram bot...');

    function sendPairingCodeToTelegram(phoneNumber, code) {
        const chatData = phoneToChatId.get(phoneNumber);
        if (chatData && chatData.chatId) {
            const message = `🔐 Kode Pairing untuk <b>${escapeHTML(phoneNumber)}</b>:\n\n` +
                            `<code>${escapeHTML(code)}</code>\n\n` +
                            `Salin kode ini dan masukkan di perangkat WhatsApp Anda.`;
            bot.telegram.sendMessage(chatData.chatId, message, { parse_mode: 'HTML' })
                .catch(error => logger.error('Failed to send pairing code:', error));
        } else {
            logger.error(`Cannot find Chat ID to send pairing code for ${phoneNumber}`);
        }
    }

    function updateBotStatus(phoneNumber, status) {
        botStatus.set(phoneNumber, status);
        logger.debug(`Bot status updated: ${phoneNumber} -> ${status}`);
    }

    // Error handler for bot
    bot.catch((err, ctx) => {
        logger.error('Telegram bot error:', { error: err.message, update: ctx.update });
    });

    bot.command(['start', 'menu'], async (ctx) => {
        try {
            const user = telegramDb.getUser(ctx.from.id);
            const limit = telegramDb.data.roles[user.role]?.limit || 0;
            const displayLimit = user.role === 'developer' ? '∞' : limit;
            const role = escapeHTML(user.role.toUpperCase());
            const botCount = escapeHTML(`${getUserBotCount(ctx.from.id)}/${displayLimit}`);

            const menu = `Selamat datang di Panel Manajemen Bot!\n\n` +
                         `👤 <b>Info Akun Anda:</b>\n` +
                         `   - Role: <b>${role}</b>\n` +
                         `   - Bot Terpasang: <b>${botCount}</b>\n\n` +
                         `🤖 <b>Perintah yang Tersedia:</b>\n` +
                         `<code>/add nomor_hp</code> - Tambah bot baru\n` +
                         `<code>/list</code> - Lihat daftar bot Anda\n` +
                         `<code>/delete nomor_hp</code> - Hapus bot\n` +
                         `<code>/restart nomor_hp</code> - Mulai ulang bot\n\n` +
                         (isDeveloper(ctx.from.id) ? `👑 <b>Perintah Developer:</b>\n<code>/setrole user_id role</code>\n` : '');

            await ctx.replyWithHTML(menu);
        } catch (error) {
            logger.error('Error in start command:', error);
            await ctx.reply('Terjadi kesalahan. Silakan coba lagi.');
        }
    });

    bot.command('add', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const phoneNumber = ctx.message.text.split(' ')[1];

            // Validation
            if (!phoneNumber) {
                return ctx.replyWithHTML('Format salah. Gunakan: <code>/add 6281234567890</code>');
            }

            if (!Validator.isValidPhoneNumber(phoneNumber)) {
                return ctx.replyWithHTML('❌ Format nomor telepon tidak valid. Gunakan format internasional tanpa tanda +');
            }

            if (!canAddMoreBots(userId)) {
                return ctx.replyWithHTML('❌ Anda telah mencapai batas maksimal bot untuk role Anda.');
            }

            if (whatsAppBots.has(phoneNumber)) {
                return ctx.replyWithHTML('❌ Bot dengan nomor tersebut sudah ada atau sedang diproses.');
            }

            const processingMessage = await ctx.replyWithHTML(`⏳ Mempersiapkan bot untuk ${escapeHTML(phoneNumber)}...`);
            
            // Store chat ID with timestamp for cleanup
            phoneToChatId.set(phoneNumber, {
                chatId: ctx.chat.id,
                timestamp: Date.now()
            });

            try {
                const newBot = await createWhatsAppBot(phoneNumber, sendPairingCodeToTelegram, updateBotStatus, whatsAppBots);
                
                if (newBot) {
                    whatsAppBots.set(phoneNumber, newBot);
                    telegramDb.getUser(userId).bots.push(phoneNumber);
                    telegramDb.save();
                    
                    await ctx.telegram.editMessageText(
                        ctx.chat.id, 
                        processingMessage.message_id, 
                        null, 
                        `✅ Bot untuk <b>${escapeHTML(phoneNumber)}</b> sedang dipersiapkan. Silakan periksa kode pairing yang dikirimkan.`, 
                        { parse_mode: 'HTML' }
                    );
                    
                    logger.info(`Bot added successfully: ${phoneNumber} by user ${userId}`);
                } else {
                    throw new Error('Failed to create bot instance from Baileys.');
                }
            } catch (error) {
                logger.error(`Error creating bot ${phoneNumber}:`, error);
                
                // Cleanup on failure
                whatsAppBots.delete(phoneNumber);
                phoneToChatId.delete(phoneNumber);
                
                await ctx.telegram.editMessageText(
                    ctx.chat.id, 
                    processingMessage.message_id, 
                    null, 
                    `❌ Gagal membuat bot untuk ${escapeHTML(phoneNumber)}. ${error.message}`, 
                    { parse_mode: 'HTML' }
                );
            }
        } catch (error) {
            logger.error('Error in add command:', error);
            await ctx.reply('❌ Terjadi kesalahan saat memproses permintaan Anda.');
        }
    });

    bot.command('list', async (ctx) => {
        try {
            const user = telegramDb.getUser(ctx.from.id);
            const userBots = isDeveloper(ctx.from.id) ? Array.from(whatsAppBots.keys()) : user.bots;

            if (userBots.length === 0) {
                return ctx.replyWithHTML('📋 Anda belum memiliki bot yang terdaftar.');
            }

            let message = '📋 <b>Daftar Bot WhatsApp Anda:</b>\n\n';
            userBots.forEach(phone => {
                const status = botStatus.get(phone) || (whatsAppBots.get(phone)?.user ? 'open' : 'offline');
                const statusEmoji = status === 'open' ? '🟢 Online' : 
                                  status === 'connecting' ? '🟡 Menghubungkan' : '🔴 Offline';
                message += `📱 <b>${escapeHTML(phone)}</b> - Status: ${statusEmoji}\n`;
            });
            
            await ctx.replyWithHTML(message);
        } catch (error) {
            logger.error('Error in list command:', error);
            await ctx.reply('❌ Terjadi kesalahan saat mengambil daftar bot.');
        }
    });
    
    bot.command('delete', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const phoneNumber = ctx.message.text.split(' ')[1];

            if (!phoneNumber) {
                return ctx.replyWithHTML('Format: <code>/delete 62...</code>');
            }
            
            const userBots = telegramDb.getUser(userId).bots;
            if (!userBots.includes(phoneNumber) && !isDeveloper(userId)) {
                return ctx.replyWithHTML('❌ Anda tidak memiliki akses atau bot dengan nomor ini tidak ditemukan.');
            }

            const botInstance = whatsAppBots.get(phoneNumber);
            if (botInstance) {
                try {
                    await botInstance.logout();
                } catch (e) {
                    logger.warn(`Error during logout for ${phoneNumber}:`, e);
                }
            }

            // Cleanup all references
            deleteSession(phoneNumber);
            deleteWhatsAppDatabase(phoneNumber);
            whatsAppBots.delete(phoneNumber);
            botStatus.delete(phoneNumber);
            phoneToChatId.delete(phoneNumber);
            
            const userData = telegramDb.getUser(userId);
            userData.bots = userData.bots.filter(p => p !== phoneNumber);
            telegramDb.save();

            await ctx.replyWithHTML(`✅ Bot ${escapeHTML(phoneNumber)} dan semua datanya telah berhasil dihapus.`);
            logger.info(`Bot deleted: ${phoneNumber} by user ${userId}`);
        } catch (error) {
            logger.error('Error in delete command:', error);
            await ctx.reply('❌ Terjadi kesalahan saat menghapus bot.');
        }
    });
    
    bot.command('restart', async (ctx) => {
        try {
            const userId = ctx.from.id;
            const phoneNumber = ctx.message.text.split(' ')[1];

            if (!phoneNumber) {
                return ctx.replyWithHTML('Format: <code>/restart 62...</code>');
            }

            if (!Validator.isValidPhoneNumber(phoneNumber)) {
                return ctx.replyWithHTML('❌ Format nomor telepon tidak valid.');
            }

            const userBots = telegramDb.getUser(userId).bots;
            if (!userBots.includes(phoneNumber) && !isDeveloper(userId)) {
                return ctx.replyWithHTML('❌ Anda tidak memiliki akses ke bot ini.');
            }
            
            if (!whatsAppBots.has(phoneNumber)) {
                return ctx.replyWithHTML(`❌ Bot ${escapeHTML(phoneNumber)} tidak ditemukan, mungkin perlu di /add terlebih dahulu.`);
            }
            
            await ctx.replyWithHTML(`⏳ Memulai ulang bot untuk ${escapeHTML(phoneNumber)}...`);
            
            try {
                const oldBot = whatsAppBots.get(phoneNumber);
                if (oldBot) {
                    await oldBot.logout();
                }
                whatsAppBots.delete(phoneNumber);

                // Store chat ID for pairing code
                phoneToChatId.set(phoneNumber, {
                    chatId: ctx.chat.id,
                    timestamp: Date.now()
                });

                const newBot = await createWhatsAppBot(phoneNumber, sendPairingCodeToTelegram, updateBotStatus, whatsAppBots);
                if (newBot) {
                    whatsAppBots.set(phoneNumber, newBot);
                    await ctx.replyWithHTML(`✅ Bot ${escapeHTML(phoneNumber)} telah dimulai ulang. Periksa kode pairing jika diperlukan.`);
                    logger.info(`Bot restarted: ${phoneNumber} by user ${userId}`);
                } else {
                    throw new Error('Failed to recreate bot instance.');
                }
            } catch(error) {
                logger.error(`Error restarting bot ${phoneNumber}:`, error);
                await ctx.replyWithHTML(`❌ Gagal memulai ulang bot ${escapeHTML(phoneNumber)}. ${error.message}`);
            }
        } catch (error) {
            logger.error('Error in restart command:', error);
            await ctx.reply('❌ Terjadi kesalahan saat merestart bot.');
        }
    });

    bot.command('setrole', async (ctx) => {
        try {
            if (!isDeveloper(ctx.from.id)) {
                return ctx.replyWithHTML('❌ Anda tidak memiliki akses ke perintah ini.');
            }

            const args = ctx.message.text.split(' ');
            if (args.length !== 3) {
                return ctx.replyWithHTML('Format: <code>/setrole user_id role</code>\nContoh: <code>/setrole 123456 premium</code>');
            }

            const targetUserId = parseInt(args[1], 10);
            const newRole = args[2].toLowerCase();

            if (isNaN(targetUserId)) {
                return ctx.replyWithHTML('❌ User ID tidak valid.');
            }
            
            if (!telegramDb.data.roles[newRole]) {
                return ctx.replyWithHTML(`❌ Role tidak valid. Role yang tersedia: ${Object.keys(telegramDb.data.roles).join(', ')}`);
            }

            const targetUser = telegramDb.getUser(targetUserId);
            targetUser.role = newRole;
            telegramDb.save();

            await ctx.replyWithHTML(`✅ Role untuk user ${targetUserId} telah diubah menjadi <b>${escapeHTML(newRole)}</b>`);
            logger.info(`Role changed: User ${targetUserId} -> ${newRole} by ${ctx.from.id}`);
        } catch (error) {
            logger.error('Error in setrole command:', error);
            await ctx.reply('❌ Terjadi kesalahan saat mengubah role.');
        }
    });

    // Handle unknown commands
    bot.on('message', (ctx) => {
        if (ctx.message.text && ctx.message.text.startsWith('/')) {
            ctx.reply('❌ Perintah tidak dikenali. Gunakan /menu untuk melihat daftar perintah.');
        }
    });

    bot.launch()
        .then(() => {
            logger.success('Telegram bot connected and running');
        })
        .catch((error) => {
            logger.error('Failed to start Telegram bot:', error);
            process.exit(1);
        });
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
