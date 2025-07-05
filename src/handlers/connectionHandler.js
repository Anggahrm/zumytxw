import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';
import { logger } from '../lib/logger.js';
import { Utils } from '../lib/utils.js';
import { deleteSession, createWhatsAppBot } from '../bots/whatsappBot.js';
import { DEFAULT_CONFIG } from '../lib/constants.js';

// Track reconnection attempts per phone number
const reconnectionAttempts = new Map();

export function handleConnectionUpdate(sock, update, phoneNumber, sendPairingCode, updateStatus, whatsAppBots) {
    const { connection, lastDisconnect } = update;

    updateStatus(phoneNumber, connection || 'offline');

    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        logger.error(`Connection closed for ${phoneNumber}`, {
            reason: DisconnectReason[reason] || 'unknown',
            error: lastDisconnect?.error?.message
        });

        if (reason === DisconnectReason.badSession) {
            logger.warn(`Bad session for ${phoneNumber}. Deleting session...`);
            deleteSession(phoneNumber);
            reconnectionAttempts.delete(phoneNumber); // Reset attempts on bad session
        }
        
        if (shouldReconnect) {
            const attempts = reconnectionAttempts.get(phoneNumber) || 0;
            
            if (attempts < DEFAULT_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                reconnectionAttempts.set(phoneNumber, attempts + 1);
                
                // Exponential backoff delay
                const delay = DEFAULT_CONFIG.RECONNECT_DELAY * Math.pow(2, attempts);
                
                logger.info(`Scheduling reconnection for ${phoneNumber} (attempt ${attempts + 1}/${DEFAULT_CONFIG.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
                
                setTimeout(async () => {
                    try {
                        const newBot = await createWhatsAppBot(phoneNumber, sendPairingCode, updateStatus, whatsAppBots);
                        if (newBot) {
                            whatsAppBots.set(phoneNumber, newBot);
                            reconnectionAttempts.delete(phoneNumber); // Reset on successful connection
                            logger.success(`Successfully reconnected bot for ${phoneNumber}`);
                        }
                    } catch (error) {
                        logger.error(`Failed to reconnect bot for ${phoneNumber}:`, error);
                    }
                }, delay);
            } else {
                logger.error(`Max reconnection attempts reached for ${phoneNumber}. Giving up.`);
                deleteSession(phoneNumber);
                whatsAppBots.delete(phoneNumber);
                reconnectionAttempts.delete(phoneNumber);
            }
        } else {
            logger.info(`Not reconnecting ${phoneNumber} due to logout.`);
            deleteSession(phoneNumber);
            whatsAppBots.delete(phoneNumber);
            reconnectionAttempts.delete(phoneNumber);
        }

    } else if (connection === 'open') {
        logger.success(`Bot ${phoneNumber} connected successfully!`);
        reconnectionAttempts.delete(phoneNumber); // Reset attempts on successful connection
        
        // Send notification to self
        try {
            sock.sendMessage(sock.user.id, { 
                text: `🟢 Bot Online! Siap menerima perintah.\n\nNomor: ${phoneNumber}\nWaktu: ${new Date().toLocaleString('id-ID')}`
            });
        } catch (error) {
            logger.warn(`Failed to send online notification for ${phoneNumber}:`, error);
        }
    } else if (connection === 'connecting') {
        logger.info(`Bot ${phoneNumber} is connecting...`);
    }
}

// Cleanup reconnection attempts periodically
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    for (const [phone, attempts] of reconnectionAttempts.entries()) {
        // If no activity for 1 hour, remove from tracking
        if (typeof attempts === 'object' && attempts.lastAttempt < oneHourAgo) {
            reconnectionAttempts.delete(phone);
        }
    }
}, 600000); // Clean every 10 minutes