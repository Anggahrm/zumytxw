import chalk from 'chalk';
import config from '../config.js';

/**
 * Logger utility for structured logging
 */
class Logger {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = this.levels[config.app.logLevel] || this.levels.info;
    }

    /**
     * Format log message with timestamp and level
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data
     * @returns {string} Formatted log message
     */
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const formattedMessage = data ? `${message} ${JSON.stringify(data)}` : message;
        return `${prefix} ${formattedMessage}`;
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {any} data - Additional data
     */
    error(message, data = null) {
        if (this.currentLevel >= this.levels.error) {
            console.error(chalk.red(this.formatMessage('error', message, data)));
        }
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {any} data - Additional data
     */
    warn(message, data = null) {
        if (this.currentLevel >= this.levels.warn) {
            console.warn(chalk.yellow(this.formatMessage('warn', message, data)));
        }
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {any} data - Additional data
     */
    info(message, data = null) {
        if (this.currentLevel >= this.levels.info) {
            console.log(chalk.blue(this.formatMessage('info', message, data)));
        }
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {any} data - Additional data
     */
    debug(message, data = null) {
        if (this.currentLevel >= this.levels.debug) {
            console.log(chalk.gray(this.formatMessage('debug', message, data)));
        }
    }

    /**
     * Log success message
     * @param {string} message - Success message
     * @param {any} data - Additional data
     */
    success(message, data = null) {
        console.log(chalk.green(this.formatMessage('success', message, data)));
    }
}

export const logger = new Logger();
export default logger;
