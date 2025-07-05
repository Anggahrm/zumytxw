/**
 * Application constants
 */

// Command categories/tags
export const COMMAND_TAGS = {
    MAIN: 'main',
    STICKER: 'sticker', 
    DOWNLOADER: 'downloader',
    GROUP: 'group',
    OWNER: 'owner',
    FUN: 'fun',
    UTILITY: 'utility'
};

// User roles
export const USER_ROLES = {
    FREE: 'free',
    PREMIUM: 'premium',
    VIP: 'vip',
    DEVELOPER: 'developer'
};

// Bot limits per role
export const ROLE_LIMITS = {
    [USER_ROLES.FREE]: 1,
    [USER_ROLES.PREMIUM]: 3,
    [USER_ROLES.VIP]: 5,
    [USER_ROLES.DEVELOPER]: Infinity
};

// Connection states
export const CONNECTION_STATES = {
    OPEN: 'open',
    CONNECTING: 'connecting',
    CLOSE: 'close',
    OFFLINE: 'offline'
};

// File types
export const SUPPORTED_MEDIA_TYPES = {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    VIDEO: ['video/mp4', 'video/webm', 'video/3gpp'],
    AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
    DOCUMENT: ['application/pdf', 'text/plain']
};

// API endpoints
export const API_ENDPOINTS = {
    BETABOTZ: 'https://api.betabotz.eu.org',
    TIKTOK_DOWNLOAD: '/api/download/tiktok'
};

// Rate limiting
export const RATE_LIMITS = {
    USER_COMMANDS: {
        maxRequests: 10,
        windowMs: 60000 // 1 minute
    },
    API_CALLS: {
        maxRequests: 50,
        windowMs: 60000 // 1 minute
    },
    MEDIA_UPLOAD: {
        maxRequests: 5,
        windowMs: 300000 // 5 minutes
    }
};

// Error messages
export const ERROR_MESSAGES = {
    INVALID_PHONE: 'Format nomor telepon tidak valid',
    RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu sebentar.',
    PERMISSION_DENIED: 'Anda tidak memiliki izin untuk menggunakan perintah ini',
    API_ERROR: 'Layanan sedang bermasalah. Coba lagi nanti.',
    INVALID_URL: 'URL yang diberikan tidak valid',
    MEDIA_TOO_LARGE: 'File media terlalu besar',
    UNSUPPORTED_FORMAT: 'Format file tidak didukung'
};

// Success messages
export const SUCCESS_MESSAGES = {
    BOT_ADDED: 'Bot berhasil ditambahkan',
    BOT_DELETED: 'Bot berhasil dihapus',
    BOT_RESTARTED: 'Bot berhasil direstart',
    COMMAND_EXECUTED: 'Perintah berhasil dieksekusi',
    FILE_UPLOADED: 'File berhasil diunggah'
};

// WhatsApp message types
export const MESSAGE_TYPES = {
    TEXT: 'conversation',
    IMAGE: 'imageMessage',
    VIDEO: 'videoMessage',
    AUDIO: 'audioMessage',
    DOCUMENT: 'documentMessage',
    STICKER: 'stickerMessage',
    CONTACT: 'contactMessage',
    LOCATION: 'locationMessage'
};

// Default configuration values
export const DEFAULT_CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    STICKER_SIZE: 320,
    MAX_VIDEO_DURATION: 10, // seconds
    SESSION_TIMEOUT: 30000, // 30 seconds
    RECONNECT_DELAY: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 5
};
