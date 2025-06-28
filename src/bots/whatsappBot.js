import pkg from '@whiskeysockets/baileys';
const { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = pkg;
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import P from 'pino';
import NodeCache from 'node-cache';
import config from '../config.js';
import makeWASocket from '../lib/simple.js';
import serialize from '../lib/serialize.js';
import { handleConnectionUpdate } from '../handlers/connectionHandler.js';
import { handleMessages } from '../handlers/messageHandler.js';

const store = {
    groupMetadata: {},
    chats: new NodeCache(),
    messages: new NodeCache(),
    contacts: new NodeCache(),
};

console.log(chalk.green.bold(`
    --------------------------------------
    ☘️ WhatsApp Bot Integration Ready
    --------------------------------------
`));

export async function createWhatsAppBot(phoneNumber, sendPairingCode, updateStatus, whatsAppBots) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(path.join(config.session.path, phoneNumber));
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(chalk.yellow.bold("📁    Menginisialisasi modul..."));
        
        const sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu("Chrome"),
            getMessage: async (key) => {
                const data = store.get(key.remoteJid);
                return data?.messages?.[key.id];
            }
        }, { store });

        if (!sock) {
            throw new Error('Inisialisasi dari simple.js gagal.');
        }


        if (!sock.authState.creds.registered) {
            console.log(chalk.yellow(`Sesi baru untuk ${phoneNumber}. Menunggu koneksi...`));
            await sock.waitForConnectionUpdate((update) => !!update.qr, 30000).catch(() => {
                throw new Error('Timeout saat menunggu koneksi siap.');
            });

            const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            sendPairingCode(phoneNumber, code);
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            handleConnectionUpdate(sock, update, phoneNumber, sendPairingCode, updateStatus, whatsAppBots);
        });

        sock.ev.on('messages.upsert', async (chatUpdate) => {
            if (!chatUpdate.messages) return;
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            
            const m = await serialize(msg, sock, store);
            if (m) await handleMessages(m, sock);
        });

        return sock;

    } catch (error) {
        console.error(chalk.red.bold(`Error kritis saat membuat bot untuk ${phoneNumber}:`), error.message);
        deleteSession(phoneNumber);
        return null;
    }
}

export function getStoredSessions() {
    const sessionsPath = config.session.path;
    if (!fs.existsSync(sessionsPath)) return [];
    
    return fs.readdirSync(sessionsPath)
        .filter(file => fs.statSync(path.join(sessionsPath, file)).isDirectory());
}

export function deleteSession(phoneNumber) {
    const sessionPath = path.join(config.session.path, phoneNumber);
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(chalk.magenta(`Sesi untuk ${phoneNumber} telah dihapus.`));
        return true;
    }
    return false;
}

export async function loadStoredSessions() {
    const sessions = getStoredSessions();
    const bots = new Map();
    console.log(chalk.blue(`Ditemukan ${sessions.length} sesi tersimpan. Memuat...`));
    
    for (const phoneNumber of sessions) {
        const bot = await createWhatsAppBot(phoneNumber, () => {}, () => {}, bots);
        if (bot) {
            bots.set(phoneNumber, bot);
        } else {
            console.error(chalk.red(`Gagal memuat sesi untuk ${phoneNumber}. Sesi telah dihapus dan perlu di-scan ulang.`));
        }
    }
    return bots;
}