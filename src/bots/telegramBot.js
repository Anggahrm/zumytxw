import { Telegraf } from 'telegraf';
import config from '../config.js';
import { createWhatsAppBot, deleteSession } from './whatsappBot.js';
import { telegramDb, deleteWhatsAppDatabase } from '../lib/database.js';
import chalk from 'chalk';

const bot = new Telegraf(config.telegram.botToken);
const botStatus = new Map();
const phoneToChatId = new Map();

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
    console.log(chalk.cyan('Bot Telegram sedang dimulai...'));

    function sendPairingCodeToTelegram(phoneNumber, code) {
        const chatId = phoneToChatId.get(phoneNumber);
        if (chatId) {
            const message = `🔐 Kode Pairing untuk <b>${escapeHTML(phoneNumber)}</b>:\n\n` +
                            `<code>${escapeHTML(code)}</code>\n\n` +
                            `Salin kode ini dan masukkan di perangkat WhatsApp Anda.`;
            bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' }).catch(console.error);
        } else {
            console.error(chalk.red(`Tidak dapat menemukan Chat ID untuk mengirim pairing code ke ${phoneNumber}`));
        }
    }

    function updateBotStatus(phoneNumber, status) {
        botStatus.set(phoneNumber, status);
    }

    bot.command(['start', 'menu'], (ctx) => {
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

        ctx.replyWithHTML(menu);
    });

    bot.command('add', async (ctx) => {
        const userId = ctx.from.id;
        const phoneNumber = ctx.message.text.split(' ')[1];

        if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
            return ctx.replyWithHTML('Format salah. Gunakan: <code>/add 6281234567890</code>');
        }
        if (!canAddMoreBots(userId)) {
            return ctx.replyWithHTML('Anda telah mencapai batas maksimal bot untuk role Anda.');
        }
        if (whatsAppBots.has(phoneNumber)) {
            return ctx.replyWithHTML('Bot dengan nomor tersebut sudah ada atau sedang diproses.');
        }

        const processingMessage = await ctx.replyWithHTML(`⏳ Mempersiapkan bot untuk ${escapeHTML(phoneNumber)}...`);
        
        try {
            phoneToChatId.set(phoneNumber, ctx.chat.id);
            const newBot = await createWhatsAppBot(phoneNumber, sendPairingCodeToTelegram, updateBotStatus, whatsAppBots);
            
            if (newBot) {
                whatsAppBots.set(phoneNumber, newBot);
                telegramDb.getUser(userId).bots.push(phoneNumber);
                telegramDb.save();
                ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, null, `✅ Bot untuk <b>${escapeHTML(phoneNumber)}</b> sedang dipersiapkan. Silakan periksa kode pairing yang dikirimkan.`, { parse_mode: 'HTML' });
            } else {
                throw new Error('Gagal membuat instance bot dari Baileys.');
            }
        } catch (error) {
            console.error(chalk.red(`Error saat membuat bot ${phoneNumber}:`), error);
            ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, null, `❌ Gagal membuat bot untuk ${escapeHTML(phoneNumber)}. Silakan coba lagi nanti.`, { parse_mode: 'HTML' });
            whatsAppBots.delete(phoneNumber);
        }
    });

    bot.command('list', (ctx) => {
        const user = telegramDb.getUser(ctx.from.id);
        const userBots = isDeveloper(ctx.from.id) ? Array.from(whatsAppBots.keys()) : user.bots;

        if (userBots.length === 0) {
            return ctx.replyWithHTML('Anda belum memiliki bot yang terdaftar.');
        }

        let message = '📋 <b>Daftar Bot WhatsApp Anda:</b>\n\n';
        userBots.forEach(phone => {
            const status = botStatus.get(phone) || (whatsAppBots.get(phone)?.user ? 'open' : 'offline');
            const statusEmoji = status === 'open' ? '🟢 Online' : status === 'connecting' ? '🟡 Menghubungkan' : '🔴 Offline';
            message += `📱 <b>${escapeHTML(phone)}</b> - Status: ${statusEmoji}\n`;
        });
        
        ctx.replyWithHTML(message);
    });
    
    bot.command('delete', async (ctx) => {
        const userId = ctx.from.id;
        const phoneNumber = ctx.message.text.split(' ')[1];

        if (!phoneNumber) return ctx.replyWithHTML('Format: <code>/delete 62...</code>');
        
        const userBots = telegramDb.getUser(userId).bots;
        if (!userBots.includes(phoneNumber) && !isDeveloper(userId)) {
            return ctx.replyWithHTML('Anda tidak memiliki akses atau bot dengan nomor ini tidak ditemukan.');
        }

        const botInstance = whatsAppBots.get(phoneNumber);
        if (botInstance) {
            await botInstance.logout().catch(e => console.error(`Error saat logout dari ${phoneNumber}:`, e));
        }

        deleteSession(phoneNumber);
        deleteWhatsAppDatabase(phoneNumber);
        whatsAppBots.delete(phoneNumber);
        botStatus.delete(phoneNumber);
        phoneToChatId.delete(phoneNumber);
        
        const userData = telegramDb.getUser(userId);
        userData.bots = userData.bots.filter(p => p !== phoneNumber);
        telegramDb.save();

        ctx.replyWithHTML(`✅ Bot ${escapeHTML(phoneNumber)} dan semua datanya telah berhasil dihapus.`);
    });
    
    bot.command('restart', async (ctx) => {
        const userId = ctx.from.id;
        const phoneNumber = ctx.message.text.split(' ')[1];

        if (!phoneNumber) return ctx.replyWithHTML('Format: <code>/restart 62...</code>');

        const userBots = telegramDb.getUser(userId).bots;
        if (!userBots.includes(phoneNumber) && !isDeveloper(userId)) {
            return ctx.replyWithHTML('Anda tidak memiliki akses ke bot ini.');
        }
        if (!whatsAppBots.has(phoneNumber)) {
            return ctx.replyWithHTML(`Bot ${escapeHTML(phoneNumber)} tidak ditemukan, mungkin perlu di /add terlebih dahulu.`);
        }
        
        await ctx.replyWithHTML(`⏳ Memulai ulang bot untuk ${escapeHTML(phoneNumber)}...`);
        
        try {
            const oldBot = whatsAppBots.get(phoneNumber);
            if (oldBot) await oldBot.logout();
            whatsAppBots.delete(phoneNumber);

            const newBot = await createWhatsAppBot(phoneNumber, sendPairingCodeToTelegram, updateBotStatus, whatsAppBots);
            if (newBot) {
                whatsAppBots.set(phoneNumber, newBot);
                ctx.replyWithHTML(`✅ Bot ${escapeHTML(phoneNumber)} telah dimulai ulang. Mungkin perlu pairing code baru.`);
            } else {
                throw new Error('Gagal membuat ulang instance bot.');
            }
        } catch(error) {
            console.error(chalk.red(`Error saat restart bot ${phoneNumber}:`), error);
            ctx.replyWithHTML(`❌ Gagal memulai ulang bot ${escapeHTML(phoneNumber)}.`);
        }
    });

    bot.command('setrole', (ctx) => {
        if (!isDeveloper(ctx.from.id)) {
            return ctx.replyWithHTML('Anda tidak memiliki akses ke perintah ini.');
        }

        const args = ctx.message.text.split(' ');
        if (args.length !== 3) {
            return ctx.replyWithHTML('Format: <code>/setrole user_id role</code>\nContoh: <code>/setrole 123456 premium</code>');
        }

        const targetUserId = parseInt(args[1], 10);
        const newRole = args[2].toLowerCase();

        if (isNaN(targetUserId)) {
            return ctx.replyWithHTML('User ID tidak valid.');
        }
        if (!telegramDb.data.roles[newRole]) {
            return ctx.replyWithHTML(`Role tidak valid. Role yang tersedia: ${Object.keys(telegramDb.data.roles).join(', ')}`);
        }

        const targetUser = telegramDb.getUser(targetUserId);
        targetUser.role = newRole;
        telegramDb.save();

        ctx.replyWithHTML(`Role untuk user ${targetUserId} telah diubah menjadi <b>${escapeHTML(newRole)}</b>`);
    });

    bot.launch();
    console.log(chalk.greenBright('Bot Telegram telah terhubung dan berjalan.'));
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}