import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';
import chalk from 'chalk';
import { deleteSession, createWhatsAppBot } from '../bots/whatsappBot.js';

export function handleConnectionUpdate(sock, update, phoneNumber, sendPairingCode, updateStatus, whatsAppBots) {
    const { connection, lastDisconnect } = update;

    updateStatus(phoneNumber, connection || 'offline');

    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        console.error(chalk.red(`Connection closed for ${phoneNumber}, reason: ${DisconnectReason[reason] || 'unknown'}`), lastDisconnect.error);

        if (reason === DisconnectReason.badSession) {
            console.log(chalk.yellow(`Bad session for ${phoneNumber}. Deleting session and restarting...`));
            deleteSession(phoneNumber);
        }
        
        if (shouldReconnect) {
            console.log(chalk.blue(`Reconnecting bot for ${phoneNumber}...`));
            createWhatsAppBot(phoneNumber, sendPairingCode, updateStatus, whatsAppBots);
        } else {
             console.log(chalk.red(`Not reconnecting ${phoneNumber} due to logout.`));
             deleteSession(phoneNumber);
             whatsAppBots.delete(phoneNumber);
        }

    } else if (connection === 'open') {
        console.log(chalk.green.bold(`Bot ${phoneNumber} connected successfully!`));
        sock.sendMessage(sock.user.id, { text: `Bot Online! Siap menerima perintah.` });
    } else if (connection === 'connecting') {
        console.log(chalk.yellow(`Bot ${phoneNumber} is connecting...`));
    }
}