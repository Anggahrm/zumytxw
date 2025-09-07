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

    /**
     * Validate user ID format (Telegram user ID)
     * @param {number|string} userId - User ID to validate
     * @returns {boolean} True if valid
     */
    static isValidUserId(userId) {
        const id = parseInt(userId);
        return !isNaN(id) && id > 0 && id < Number.MAX_SAFE_INTEGER;
    }

    /**
     * Validate image URL
     * @param {string} url - Image URL to validate
     * @returns {boolean} True if valid image URL
     */
    static isValidImageUrl(url) {
        if (!this.isValidUrl(url)) return false;
        return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
    }

    /**
     * Validate message content for harmful patterns
     * @param {string} content - Message content to validate
     * @returns {Object} Validation result with isValid and reason
     */
    static validateMessageContent(content) {
        if (typeof content !== 'string') {
            return { isValid: false, reason: 'Content must be a string' };
        }

        // Check for potential spam patterns
        const spamPatterns = [
            /(.)\1{10,}/gi, // Repeated characters (more than 10)
            /[\u200B-\u200D\uFEFF]/g, // Zero-width characters
            /(http|https):\/\/[^\s]+/gi // Multiple URLs
        ];

        for (const pattern of spamPatterns) {
            if (pattern.test(content)) {
                return { isValid: false, reason: 'Content contains suspicious patterns' };
            }
        }

        // Check length limits
        if (content.length > 4000) {
            return { isValid: false, reason: 'Content too long' };
        }

        return { isValid: true, reason: null };
    }

    /**
     * Validate and sanitize filename
     * @param {string} filename - Filename to validate
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') return 'file';
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 100);
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

    /**
     * Debounce function to limit execution frequency
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }
}

/**
 * Security utilities
 */
export class SecurityUtils {
    /**
     * Generate a secure random string
     * @param {number} length - Length of the string
     * @returns {string} Random string
     */
    static generateSecureId(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Validate and sanitize command input
     * @param {string} command - Command to validate
     * @returns {Object} Validation result
     */
    static validateCommand(command) {
        if (typeof command !== 'string') {
            return { isValid: false, reason: 'Command must be a string' };
        }

        // Check command length
        if (command.length > 50) {
            return { isValid: false, reason: 'Command too long' };
        }

        // Check for valid command format (alphanumeric and common symbols)
        if (!/^[a-zA-Z0-9._-]+$/.test(command)) {
            return { isValid: false, reason: 'Command contains invalid characters' };
        }

        return { isValid: true, sanitized: command.toLowerCase() };
    }

    /**
     * Check if user ID is in allowed list
     * @param {number} userId - User ID to check
     * @param {Array} allowedUsers - Array of allowed user IDs
     * @returns {boolean} True if allowed
     */
    static isUserAllowed(userId, allowedUsers = []) {
        return allowedUsers.includes(userId);
    }

    /**
     * Detect potential security threats in content
     * @param {string} content - Content to analyze
     * @returns {Object} Threat analysis result
     */
    static analyzeSecurityThreats(content) {
        const threats = [];
        
        // Check for potential script injection
        if (/<script|javascript:|data:|vbscript:/i.test(content)) {
            threats.push('Potential script injection detected');
        }

        // Check for SQL injection patterns
        if (/(union|select|insert|update|delete|drop|exec|script)/i.test(content)) {
            threats.push('Potential SQL injection pattern detected');
        }

        // Check for path traversal
        if (/\.\.\/|\.\.\\|%2e%2e/i.test(content)) {
            threats.push('Potential path traversal detected');
        }

        // Check for command injection
        if (/[;&|`$()]/g.test(content)) {
            threats.push('Potential command injection detected');
        }

        return {
            hasThreats: threats.length > 0,
            threats,
            riskLevel: threats.length === 0 ? 'low' : threats.length < 3 ? 'medium' : 'high'
        };
    }
}

/**
 * Health monitoring utilities
 */
export class HealthMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            requestCount: 0,
            errorCount: 0,
            lastError: null,
            memoryUsage: process.memoryUsage(),
            uptime: 0
        };
        
        // Update metrics every minute
        setInterval(() => this.updateMetrics(), 60000);
    }

    /**
     * Update system metrics
     */
    updateMetrics() {
        this.metrics.uptime = Date.now() - this.metrics.startTime;
        this.metrics.memoryUsage = process.memoryUsage();
    }

    /**
     * Record a request
     */
    recordRequest() {
        this.metrics.requestCount++;
    }

    /**
     * Record an error
     * @param {Error} error - Error to record
     */
    recordError(error) {
        this.metrics.errorCount++;
        this.metrics.lastError = {
            message: error.message,
            timestamp: Date.now()
        };
    }

    /**
     * Get health status
     * @returns {Object} Health status
     */
    getStatus() {
        const memoryUsageMB = Math.round(this.metrics.memoryUsage.used / 1024 / 1024);
        const errorRate = this.metrics.requestCount > 0 ? 
            (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) : 0;

        return {
            status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'critical',
            uptime: Utils.formatUptime(this.metrics.uptime),
            requestCount: this.metrics.requestCount,
            errorCount: this.metrics.errorCount,
            errorRate: `${errorRate}%`,
            memoryUsage: `${memoryUsageMB} MB`,
            lastError: this.metrics.lastError
        };
    }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();
