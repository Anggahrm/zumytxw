import { startTelegramBot } from './bots/telegramBot.js';
import { loadStoredSessions } from './bots/whatsappBot.js';
import { loadCommands } from './handlers/commandHandler.js';
import { logger } from './lib/logger.js';
import { checkConfiguration, displayStartupInfo, setupShutdownHandlers } from './lib/startup.js';
import fs from 'fs';
import config from './config.js';

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 */
const ensureDirectoryExistence = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);
    }
};

/**
 * Main application entry point
 */
async function main() {
    try {
        // Display startup information
        displayStartupInfo();
        
        // Validate configuration
        checkConfiguration();
        
        // Setup graceful shutdown handlers
        setupShutdownHandlers();
        
        // Ensure required directories exist
        logger.info('Setting up directories...');
        ensureDirectoryExistence(config.session.path);
        ensureDirectoryExistence(config.database.path);
        
        // Load commands
        logger.info('Loading commands...');
        await loadCommands();
        
        // Load stored WhatsApp sessions
        logger.info('Loading stored WhatsApp sessions...');
        const whatsAppBots = await loadStoredSessions();
        
        // Start Telegram bot
        logger.info('Starting Telegram bot...');
        startTelegramBot(whatsAppBots);
        
        logger.success('✅ Application started successfully!');
        logger.info('Telegram Bot is running and managing WhatsApp bots.');
        
        // Optional: Display additional runtime information
        if (config.app.environment === 'development') {
            logger.debug('Development mode enabled - additional logging active');
        }
        
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Start the application
main();