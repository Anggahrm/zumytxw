import config from '../config.js';
import { logger } from '../lib/logger.js';
import { Validator } from '../lib/utils.js';

/**
 * Validate application configuration
 * @returns {Object} Validation result with success flag and errors
 */
export function validateConfig() {
    const errors = [];
    const warnings = [];

    // Required configurations
    if (!config.telegram.botToken) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    } else if (config.telegram.botToken === 'xxx' || config.telegram.botToken.length < 10) {
        errors.push('TELEGRAM_BOT_TOKEN appears to be invalid or placeholder');
    }

    if (!config.telegram.ownerId || config.telegram.ownerId === 0) {
        errors.push('TELEGRAM_OWNER_ID is required');
    }

    if (!config.whatsapp.ownerNumbers || config.whatsapp.ownerNumbers.length === 0) {
        errors.push('WHATSAPP_OWNER_NUMBERS is required');
    }

    // Optional but recommended configurations
    if (!config.apiKeys.betabotz) {
        warnings.push('BETABOTZ_API_KEY not set - TikTok downloader will not work');
    }

    // Validate paths
    if (!config.database.path) {
        errors.push('DATABASE_PATH is required');
    }

    if (!config.session.path) {
        errors.push('SESSION_PATH is required');
    }

    // Validate WhatsApp owner numbers format
    config.whatsapp.ownerNumbers.forEach((number, index) => {
        if (!/^\d{10,15}$/.test(number.replace(/\D/g, ''))) {
            warnings.push(`WhatsApp owner number ${index + 1} may be invalid: ${number}`);
        }
    });

    // Validate Telegram owner ID format
    if (!Validator.isValidUserId(config.telegram.ownerId)) {
        errors.push('TELEGRAM_OWNER_ID must be a valid positive integer');
    }

    // Security validation for API keys
    if (config.apiKeys.betabotz && config.apiKeys.betabotz.length < 10) {
        warnings.push('BETABOTZ_API_KEY appears to be too short');
    }

    // Validate environment
    const validEnvironments = ['development', 'production', 'testing'];
    if (!validEnvironments.includes(config.app.environment)) {
        warnings.push(`Invalid environment: ${config.app.environment}. Using 'development' as fallback.`);
        config.app.environment = 'development';
    }

    // Validate log level
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(config.app.logLevel)) {
        warnings.push(`Invalid log level: ${config.app.logLevel}. Using 'info' as fallback.`);
        config.app.logLevel = 'info';
    }

    return {
        success: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Display configuration validation results and exit if critical errors exist
 */
export function checkConfiguration() {
    logger.info('Validating configuration...');
    
    const validation = validateConfig();
    
    if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warn(warning));
    }
    
    if (!validation.success) {
        logger.error('Configuration validation failed:');
        validation.errors.forEach(error => logger.error(`  - ${error}`));
        logger.error('Please check your .env file or environment variables');
        process.exit(1);
    }
    
    logger.success('Configuration validation passed');
}

/**
 * Display application startup information
 */
export function displayStartupInfo() {
    const nodeVersion = process.version;
    const platform = process.platform;
    const architecture = process.arch;
    
    logger.info('='.repeat(50));
    logger.info('🚀 ZumyTXW - Telegram WhatsApp Bot Manager');
    logger.info('='.repeat(50));
    logger.info(`Node.js: ${nodeVersion}`);
    logger.info(`Platform: ${platform} (${architecture})`);
    logger.info(`Environment: ${config.app.environment}`);
    logger.info(`Log Level: ${config.app.logLevel}`);
    logger.info(`Bot Name: ${config.whatsapp.botInfo.name}`);
    logger.info(`Author: ${config.whatsapp.botInfo.author}`);
    logger.info('='.repeat(50));
}

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers() {
    const gracefulShutdown = (signal) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);
        
        // Add cleanup logic here if needed
        // - Close database connections
        // - Save any pending data
        // - Close WebSocket connections
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
