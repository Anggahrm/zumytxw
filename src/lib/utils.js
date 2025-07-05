import { logger } from './logger.js';

/**
 * Input validation utilities
 */
export class Validator {
    /**
     * Validate phone number format
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} True if valid
     */
    static isValidPhoneNumber(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return false;
        }
        // Remove all non-digit characters and check length
        const cleaned = phoneNumber.replace(/\D/g, '');
        return /^\d{10,15}$/.test(cleaned);
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate TikTok URL
     * @param {string} url - TikTok URL to validate
     * @returns {boolean} True if valid TikTok URL
     */
    static isValidTikTokUrl(url) {
        if (!this.isValidUrl(url)) return false;
        return /tiktok\.com|vm\.tiktok\.com/i.test(url);
    }

    /**
     * Sanitize text input to prevent injection
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    static sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/[<>'"]/g, '') // Remove potential HTML/script tags
            .trim()
            .substring(0, 1000); // Limit length
    }

    /**
     * Validate file path to prevent directory traversal
     * @param {string} filePath - File path to validate
     * @returns {boolean} True if safe
     */
    static isSafeFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') return false;
        // Check for directory traversal attempts
        return !filePath.includes('..') && !filePath.includes('/etc/') && !filePath.includes('/proc/');
    }

    /**
     * Validate command arguments
     * @param {Array} args - Command arguments
     * @param {number} minLength - Minimum required arguments
     * @param {number} maxLength - Maximum allowed arguments
     * @returns {boolean} True if valid
     */
    static validateArgs(args, minLength = 0, maxLength = 10) {
        if (!Array.isArray(args)) return false;
        return args.length >= minLength && args.length <= maxLength;
    }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.limits = {
            user: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute per user
            global: { maxRequests: 100, windowMs: 60000 } // 100 requests per minute globally
        };
    }

    /**
     * Check if request is within rate limit
     * @param {string} identifier - User/session identifier
     * @param {string} type - Rate limit type ('user' or 'global')
     * @returns {boolean} True if within limit
     */
    isWithinLimit(identifier, type = 'user') {
        const now = Date.now();
        const limit = this.limits[type];
        
        if (!limit) return true;

        const key = `${type}_${identifier}`;
        const userRequests = this.requests.get(key) || [];
        
        // Remove expired requests
        const validRequests = userRequests.filter(time => now - time < limit.windowMs);
        
        if (validRequests.length >= limit.maxRequests) {
            logger.warn(`Rate limit exceeded for ${key}`);
            return false;
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(key, validRequests);
        
        return true;
    }

    /**
     * Clean up expired rate limit data
     */
    cleanup() {
        const now = Date.now();
        for (const [key, requests] of this.requests.entries()) {
            const validRequests = requests.filter(time => now - time < 300000); // 5 minutes
            if (validRequests.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validRequests);
            }
        }
    }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

/**
 * Error handling utilities
 */
export class ErrorHandler {
    /**
     * Handle and format error for user display
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     * @returns {string} User-friendly error message
     */
    static formatUserError(error, context = '') {
        logger.error(`Error in ${context}:`, { message: error.message, stack: error.stack });
        
        // Don't expose internal errors to users
        const genericMessage = 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.';
        
        // Map specific errors to user-friendly messages
        const errorMap = {
            'ENOTFOUND': 'Koneksi internet bermasalah. Periksa koneksi Anda.',
            'ETIMEDOUT': 'Koneksi timeout. Silakan coba lagi.',
            'Rate limit exceeded': 'Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.',
            'Invalid API key': 'Konfigurasi API bermasalah. Hubungi administrator.'
        };

        for (const [errorType, message] of Object.entries(errorMap)) {
            if (error.message.includes(errorType)) {
                return message;
            }
        }

        return genericMessage;
    }

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Context for error logging
     * @returns {Function} Wrapped function
     */
    static asyncWrapper(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                logger.error(`Error in ${context}:`, error);
                throw error;
            }
        };
    }
}

/**
 * Utility functions
 */
export class Utils {
    /**
     * Format uptime in human readable format
     * @param {number} uptime - Uptime in milliseconds
     * @returns {string} Formatted uptime
     */
    static formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after sleep
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Promise that resolves with function result
     */
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }
}
