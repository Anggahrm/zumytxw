import fs from 'fs';
import path from 'path';
import config from '../config.js';
import chalk from 'chalk';

const { database: { path: dbPath } } = config;

// --- WhatsApp Database ---
const waDatabases = new Map();

class WhatsAppDatabase {
    constructor(phoneNumber) {
        this.path = path.join(dbPath, phoneNumber, 'database.json');
        this.data = {
            chats: {},
            users: {}
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.path)) {
                const data = fs.readFileSync(this.path, 'utf8');
                this.data = JSON.parse(data);
            } else {
                this.save();
            }
        } catch (error) {
            console.error(chalk.red(`Error loading database for ${path.dirname(this.path)}:`), error);
            this.save();
        }
    }

    save() {
        try {
            fs.mkdirSync(path.dirname(this.path), { recursive: true });
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error(chalk.red(`Error saving database for ${path.dirname(this.path)}:`), error);
        }
    }

    initChat(chatId) {
        if (!this.data.chats[chatId]) {
            this.data.chats[chatId] = {
                isBanned: false,
                listStr: {},
                welcome: true,
            };
            this.save();
        }
        return this.data.chats[chatId];
    }

    initUser(userId) {
        if (!this.data.users[userId]) {
            this.data.users[userId] = {
                banned: false,
                name: '',
            };
            this.save();
        }
        return this.data.users[userId];
    }
}

export function getWhatsAppDatabase(phoneNumber) {
    if (!waDatabases.has(phoneNumber)) {
        waDatabases.set(phoneNumber, new WhatsAppDatabase(phoneNumber));
    }
    return waDatabases.get(phoneNumber);
}

export function deleteWhatsAppDatabase(phoneNumber) {
    waDatabases.delete(phoneNumber);
    const fullPath = path.join(dbPath, phoneNumber);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
}


// --- Telegram Database ---
class TelegramDatabase {
    constructor() {
        this.path = path.join(dbPath, 'telegram_database.json');
        this.data = {
            users: {},
            roles: {
                free: { limit: 1 },
                premium: { limit: 3 },
                vip: { limit: 5 },
                developer: { limit: Infinity }
            }
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.path)) {
                this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
            } else {
                this.save();
            }
        } catch (e) {
            console.error(chalk.red('Error loading Telegram database:'), e);
            this.save();
        }
    }

    save() {
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error(chalk.red('Error saving Telegram database:'), e);
        }
    }

    getUser(userId) {
        if (!this.data.users[userId]) {
            this.data.users[userId] = {
                role: userId === config.telegram.ownerId ? 'developer' : 'free',
                bots: [],
            };
            this.save();
        }
        return this.data.users[userId];
    }

    setUserRole(userId, role) {
        const user = this.getUser(userId);
        if (userId === config.telegram.ownerId && role !== 'developer') {
            return user;
        }
        user.role = role;
        this.save();
        return user;
    }

    addUserBot(userId, phoneNumber) {
        const user = this.getUser(userId);
        if (!user.bots.includes(phoneNumber)) {
            user.bots.push(phoneNumber);
            this.save();
        }
        return user;
    }

    removeUserBot(userId, phoneNumber) {
        const user = this.getUser(userId);
        user.bots = user.bots.filter(bot => bot !== phoneNumber);
        this.save();
        return user;
    }

    getUserBots(userId) {
        const user = this.getUser(userId);
        return user.bots;
    }

    isDeveloper(userId) {
        const user = this.getUser(userId);
        return user.role === 'developer';
    }

    getRoleLimit(role) {
        return this.data.settings.roles[role]?.limit || 0;
    }

    canAddMoreBots(userId) {
        const user = this.getUser(userId);
        if (user.role === 'developer') return true;
        const limit = this.getRoleLimit(user.role);
        return user.bots.length < limit;
    }
    updateRoleLimit(role, limit) {
        if (role === 'developer') return;
        if (!this.data.settings.roles[role]) {
            this.data.settings.roles[role] = {};
        }
        this.data.settings.roles[role].limit = limit;
        this.save();
    }
}

export const telegramDb = new TelegramDatabase();