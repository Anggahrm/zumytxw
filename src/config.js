import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * Uses environment variables with fallback defaults
 */
export default {
    // Telegram Configuration
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        ownerId: parseInt(process.env.TELEGRAM_OWNER_ID) || 0
    },
    
    // WhatsApp Configuration
    whatsapp: {
        ownerNumbers: process.env.WHATSAPP_OWNER_NUMBERS?.split(',') || [],
        botInfo: {
            name: process.env.BOT_NAME || 'ZumyNext Multi-Device',
            author: process.env.BOT_AUTHOR || 'anggahrm',
            website: process.env.BOT_WEBSITE || 'https://zumynext.tech',
            thumbnail: process.env.BOT_THUMBNAIL || 'https://files.catbox.moe/p5q4ro.jpg'
        }
    },

    // API Keys
    apiKeys: {
        betabotz: process.env.BETABOTZ_API_KEY || ''
    },

    // Paths
    database: {
        path: process.env.DATABASE_PATH || './databases'
    },
    
    session: {
        path: process.env.SESSION_PATH || './sessions'
    },

    // Application settings
    app: {
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
    }
};
