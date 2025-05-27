// File: logger.js
// Purpose: Centralized logging utility for the web scraping project
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import fs from 'fs';
import path from 'path';
import { LOG_BASE_PATH } from './config.js';

/**
 * Ensure log directory exists
 * @param {string} logPath - Path to log directory
 */
const ensureLogDirectoryExists = (logPath) => {
    try {
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
    }
};

/**
 * Centralized logging function
 * @param {string} message - Log message
 * @param {string} logPath - Path to log file
 * @param {Object} options - Logging options
 */
const log = (
    message, 
    logPath = path.join(LOG_BASE_PATH, 'default_log.txt'), 
    options = {}
) => {
    const {
        toConsole = true,
        logLevel = 'INFO',
        includeTimestamp = true,
        maxLogFileSize = 10 * 1024 * 1024, // 10MB
    } = options;

    try {
        // Ensure log directory exists
        ensureLogDirectoryExists(logPath);
        
        // Rotate log file if it exceeds max size
        if (fs.existsSync(logPath) && fs.statSync(logPath).size > maxLogFileSize) {
            rotateLogFile(logPath);
        }

        // Construct log entry
        const timestamp = includeTimestamp ? `[${new Date().toISOString()}]` : '';
        const logEntry = `${timestamp} [${logLevel}] ${message}\n`;

        // Write to log file
        fs.appendFileSync(logPath, logEntry);

        // Optionally log to console
        if (toConsole) {
            console.log(colorizeLogMessage(logLevel, logEntry.trim()));
        }
    } catch (error) {
        console.error(`Logging failed: ${error.message}`);
    }
};

/**
 * Rotate log file when it becomes too large
 * @param {string} logPath - Path to log file
 */
const rotateLogFile = (logPath) => {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const archiveDir = path.join(path.dirname(logPath), 'archive');
        
        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const archiveFileName = `${path.basename(logPath)}_${timestamp}`;
        const archivePath = path.join(archiveDir, archiveFileName);
        
        // Rename current log file to archive
        fs.renameSync(logPath, archivePath);
    } catch (error) {
        console.error(`Log rotation failed: ${error.message}`);
    }
};

/**
 * Add color to log messages based on log level
 * @param {string} logLevel - Log level
 * @param {string} message - Log message
 * @returns {string} - Colored log message
 */
const colorizeLogMessage = (logLevel, message) => {
    const colors = {
        INFO: '\x1b[36m', // Cyan
        WARN: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m', // Red
        DEBUG: '\x1b[35m', // Magenta
        SUCCESS: '\x1b[32m' // Green
    };
    const resetColor = '\x1b[0m';
    const color = colors[logLevel.toUpperCase()] || '\x1b[0m';
    return `${color}${message}${resetColor}`;
};

/**
 * Create a child logger with predefined options
 * @param {string} logPath - Base log path
 * @param {Object} defaultOptions - Default logging options
 * @returns {Function} - Configured log function
 */
const createChildLogger = (logPath, defaultOptions = {}) => {
    return (message, options = {}) => {
        log(message, logPath, { ...defaultOptions, ...options });
    };
};

export { 
    log, 
    createChildLogger,
    rotateLogFile
};

// end logger.js
