// File: logger.js
// Purpose: Centralized logging utility for the web scraping project
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import fs from 'fs';
import path from 'path';
import { LOG_BASE_PATH } from './config.js';

/**
 * Enhanced Performance and Debug Logger for Web Scraping
 * Supports structured logging, performance metrics, and comprehensive debugging
 */

// Global session tracking
let sessionId = null;
let sessionStartTime = null;
let performanceMetrics = new Map();
let errorTracking = new Map();

/**
 * Initialize logging session with unique ID and performance tracking
 * @param {string} sessionName - Name for this session
 * @returns {string} Session ID
 */
const initializeLoggingSession = (sessionName = 'scraping-session') => {
    sessionId = `${sessionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStartTime = Date.now();
    performanceMetrics.clear();
    errorTracking.clear();

    // Initialize performance tracking categories
    performanceMetrics.set('navigation', []);
    performanceMetrics.set('processing', []);
    performanceMetrics.set('memory', []);
    performanceMetrics.set('network', []);
    performanceMetrics.set('fileio', []);

    return sessionId;
};

/**
 * Record performance metric with timestamp and context
 * @param {string} category - Metric category (navigation, processing, memory, etc.)
 * @param {string} operation - Specific operation name
 * @param {number} value - Metric value (time in ms, bytes, count, etc.)
 * @param {Object} context - Additional context data
 */
const recordPerformanceMetric = (category, operation, value, context = {}) => {
    if (!performanceMetrics.has(category)) {
        performanceMetrics.set(category, []);
    }

    const metric = {
        timestamp: Date.now(),
        sessionId,
        operation,
        value,
        context,
        sessionTime: Date.now() - (sessionStartTime || Date.now())
    };

    performanceMetrics.get(category).push(metric);

    // Log significant metrics immediately
    if (category === 'memory' && value > 400 * 1024 * 1024) { // >400MB
        logStructured('HIGH_MEMORY_USAGE', {
            category: 'performance',
            operation,
            memoryMB: Math.round(value / 1024 / 1024),
            context
        }, 'WARN');
    }

    if (category === 'navigation' && value > 30000) { // >30 seconds
        logStructured('SLOW_NAVIGATION', {
            category: 'performance',
            operation,
            timeMs: value,
            context
        }, 'WARN');
    }
};

/**
 * Track and categorize errors with context
 * @param {string} errorType - Type of error (navigation, network, parsing, etc.)
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context data
 */
const trackError = (errorType, error, context = {}) => {
    if (!errorTracking.has(errorType)) {
        errorTracking.set(errorType, []);
    }

    const errorRecord = {
        timestamp: Date.now(),
        sessionId,
        message: error.message || error,
        stack: error.stack || 'No stack trace',
        code: error.code || 'UNKNOWN',
        context,
        sessionTime: Date.now() - (sessionStartTime || Date.now())
    };

    errorTracking.get(errorType).push(errorRecord);

    // Log error immediately with structured format
    logStructured('ERROR_TRACKED', {
        category: 'error',
        errorType,
        error: errorRecord,
        context
    }, 'ERROR');
};

/**
 * Structured logging with consistent format and context
 * @param {string} event - Event name/type
 * @param {Object} data - Structured data object
 * @param {string} logLevel - Log level
 * @param {string} logPath - Optional custom log path
 */
const logStructured = (event, data, logLevel = 'INFO', logPath = null) => {
    const structuredEntry = {
        timestamp: new Date().toISOString(),
        sessionId: sessionId || 'no-session',
        sessionTime: sessionStartTime ? Date.now() - sessionStartTime : 0,
        event,
        level: logLevel,
        data,
        process: {
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        }
    };

    const message = `[STRUCTURED] ${JSON.stringify(structuredEntry)}`;

    // Use default log path if none provided
    const defaultLogPath = LOG_BASE_PATH ? path.join(LOG_BASE_PATH, 'session.log') : './session.log';
    const actualLogPath = logPath || defaultLogPath;

    log(message, actualLogPath, { logLevel, toConsole: logLevel !== 'DEBUG' });
};

/**
 * Generate comprehensive session performance report
 * @returns {Object} Performance summary
 */
const generatePerformanceReport = () => {
    const report = {
        sessionId,
        sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0,
        timestamp: new Date().toISOString(),
        metrics: {},
        errors: {},
        summary: {}
    };

    // Process performance metrics
    for (const [category, metrics] of performanceMetrics.entries()) {
        if (metrics.length > 0) {
            const values = metrics.map(m => m.value);
            report.metrics[category] = {
                count: metrics.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                recent: metrics.slice(-5), // Last 5 metrics
                trends: calculateTrends(values)
            };
        }
    }

    // Process error tracking
    for (const [errorType, errors] of errorTracking.entries()) {
        report.errors[errorType] = {
            count: errors.length,
            recent: errors.slice(-3), // Last 3 errors
            firstOccurrence: errors[0]?.timestamp,
            lastOccurrence: errors[errors.length - 1]?.timestamp
        };
    }

    // Generate summary
    const totalErrors = Array.from(errorTracking.values()).reduce((sum, errors) => sum + errors.length, 0);
    const totalMetrics = Array.from(performanceMetrics.values()).reduce((sum, metrics) => sum + metrics.length, 0);

    report.summary = {
        totalErrors,
        totalMetrics,
        errorRate: totalMetrics > 0 ? (totalErrors / totalMetrics * 100).toFixed(2) + '%' : '0%',
        sessionHealth: calculateSessionHealth(totalErrors, totalMetrics),
        recommendations: generateRecommendations(report)
    };

    return report;
};

/**
 * Calculate performance trends from metrics array
 * @param {number[]} values - Array of metric values
 * @returns {Object} Trend analysis
 */
const calculateTrends = (values) => {
    if (values.length < 2) return { trend: 'insufficient_data' };

    const recent = values.slice(-Math.min(10, values.length));
    const older = values.slice(0, Math.max(1, values.length - 10));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg * 100);

    return {
        trend: change > 20 ? 'degrading' : change < -20 ? 'improving' : 'stable',
        changePercent: change.toFixed(1),
        recentAverage: recentAvg.toFixed(2),
        historicalAverage: olderAvg.toFixed(2)
    };
};

/**
 * Calculate overall session health score
 * @param {number} totalErrors - Total error count
 * @param {number} totalMetrics - Total metrics count
 * @returns {Object} Health assessment
 */
const calculateSessionHealth = (totalErrors, totalMetrics) => {
    if (totalMetrics === 0) return { score: 100, status: 'unknown' };

    const errorRate = totalErrors / totalMetrics;
    let score = 100;

    // Deduct points for errors
    score -= Math.min(50, errorRate * 100 * 5); // Max 50 points for errors

    // Check performance metrics for additional deductions
    const memoryMetrics = performanceMetrics.get('memory') || [];
    const navigationMetrics = performanceMetrics.get('navigation') || [];

    // Memory usage penalty
    const highMemoryEvents = memoryMetrics.filter(m => m.value > 500 * 1024 * 1024).length;
    score -= Math.min(25, highMemoryEvents * 5);

    // Navigation performance penalty
    const slowNavigations = navigationMetrics.filter(m => m.value > 30000).length;
    score -= Math.min(25, slowNavigations * 5);

    score = Math.max(0, Math.round(score));

    return {
        score,
        status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
        factors: {
            errorRate: (errorRate * 100).toFixed(2) + '%',
            highMemoryEvents,
            slowNavigations
        }
    };
};

/**
 * Generate actionable recommendations based on session data
 * @param {Object} report - Performance report
 * @returns {string[]} Array of recommendations
 */
const generateRecommendations = (report) => {
    const recommendations = [];

    // Memory recommendations
    if (report.metrics.memory?.avg > 400 * 1024 * 1024) {
        recommendations.push('Consider reducing browser concurrency or implementing more aggressive cleanup');
    }

    // Navigation recommendations
    if (report.metrics.navigation?.avg > 20000) {
        recommendations.push('Page load times are high - consider timeout optimization or network analysis');
    }

    // Error recommendations
    const networkErrors = report.errors.network?.count || 0;
    if (networkErrors > 10) {
        recommendations.push('High network error count - check network stability and retry logic');
    }

    // Processing recommendations
    if (report.metrics.processing?.avg > 5000) {
        recommendations.push('URL processing time is high - consider optimizing keyword filtering or content extraction');
    }

    if (recommendations.length === 0) {
        recommendations.push('System performance is within normal parameters');
    }

    return recommendations;
};

/**
 * Ensure log directory exists
 * @param {string} logPath - Path to log directory
 */
const ensureLogDirectoryExists = (logPath) => {
    try {
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
            logStructured('LOG_DIRECTORY_CREATED', { path: logDir }, 'DEBUG');
        }
    } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
        trackError('filesystem', error, { operation: 'create_log_directory', path: logPath });
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
        // Resolve to absolute path to prevent traversal
        const resolvedLogPath = path.resolve(logPath);
        const archiveDir = path.join(path.dirname(resolvedLogPath), 'archive');

        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        const archiveFileName = path.basename(resolvedLogPath) + '_' + timestamp;
        const archivePath = path.join(archiveDir, archiveFileName);
        
        // Rename current log file to archive
        fs.renameSync(resolvedLogPath, archivePath);
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
    rotateLogFile,
    initializeLoggingSession,
    recordPerformanceMetric,
    trackError,
    logStructured,
    generatePerformanceReport
};

// end logger.js
