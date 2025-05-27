// File: userAgentUtils.js
// Purpose: User agent generation and validation utilities for web scraping
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import { USER_AGENT_OPTIONS } from './config.js';
import { log } from './logger.js';

/**
 * Generate a random user agent string
 * @returns {string} - Randomly generated user agent
 */
const generateRandomUserAgent = () => {
    const { browsers, platforms } = USER_AGENT_OPTIONS;
    
    const browserName = browsers[Math.floor(Math.random() * browsers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    const browserVersion = Math.floor(Math.random() * 20) + 90;
    const webkitVersion = Math.floor(Math.random() * 500) + 537;
    
    let userAgent = '';
    
    switch(browserName) {
        case 'Chrome':
            userAgent = `Mozilla/5.0 (${platform}) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)} Safari/${webkitVersion}.36`;
            break;
        case 'Firefox':
            userAgent = `Mozilla/5.0 (${platform}; rv:${browserVersion}.0) Gecko/20100101 Firefox/${browserVersion}.0`;
            break;
        case 'Safari':
            userAgent = `Mozilla/5.0 (${platform}) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Version/14.1.1 Safari/${webkitVersion}.36`;
            break;
        case 'Edge':
            userAgent = `Mozilla/5.0 (${platform}) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)} Safari/${webkitVersion}.36 Edg/${browserVersion}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)}`;
            break;
        default:
            // Fallback to Chrome if somehow no browser is selected
            userAgent = `Mozilla/5.0 (${platform}) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)} Safari/${webkitVersion}.36`;
    }
    
    return userAgent;
};

/**
 * Validate a user agent string
 * @param {string} userAgent - User agent string to validate
 * @returns {boolean} - Whether the user agent is valid
 */
const validateUserAgent = (userAgent) => {
    // Comprehensive validation checks
    const validationChecks = [
        userAgent.length > 0,
        userAgent.includes('Mozilla/5.0'),
        userAgent.includes('AppleWebKit') || userAgent.includes('Gecko'),
        // Additional checks for specific browser characteristics
        userAgent.match(/Chrome\/\d+\.\d+/) || 
        userAgent.match(/Firefox\/\d+\.\d+/) || 
        userAgent.match(/Safari\/\d+\.\d+/) || 
        userAgent.match(/Edg\/\d+\.\d+/)
    ];
    return validationChecks.every(check => check);
};

/**
 * Generate a validated user agent, retrying if necessary
 * @param {number} maxAttempts - Maximum number of attempts to generate a valid user agent
 * @param {string} logPath - Path to log file for recording attempts
 * @returns {string} - Validated user agent
 */
const generateValidatedUserAgent = (maxAttempts = 5, logPath = null) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const userAgent = generateRandomUserAgent();
            
            if (validateUserAgent(userAgent)) {
                return userAgent;
            }
            
            // Optional logging for failed attempts
            if (logPath) {
                log(`Invalid user agent generated on attempt ${attempt + 1}`, logPath);
            }
        } catch (error) {
            if (logPath) {
                log(`Error generating user agent: ${error.message}`, logPath);
            }
        }
    }
    
    // Fallback to a standard, well-known user agent if validation consistently fails
    const fallbackUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    if (logPath) {
        log(`Falling back to standard user agent after ${maxAttempts} attempts`, logPath);
    }
    
    return fallbackUserAgent;
};

export { 
    generateRandomUserAgent, 
    validateUserAgent, 
    generateValidatedUserAgent 
};

// end userAgentUtils.js
