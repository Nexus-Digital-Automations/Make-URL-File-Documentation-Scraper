// File: urlUtils.js
// Purpose: Utility functions for URL normalization and validation
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import { URL } from 'url';
import { log } from './logger.js'; // Importing the logging utility

/**
 * Advanced URL normalization function
 * @param {string} inputUrl - The URL to normalize
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {string|null} - Normalized URL or null if invalid
 */
const normalizeUrl = (inputUrl, logFilePath) => {
    try {
        // Trim whitespace
        inputUrl = inputUrl.trim();
        
        // Handle relative URLs
        if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
            inputUrl = `https://${inputUrl}`;
        }
        
        const url = new URL(inputUrl);
        
        // Remove fragment identifier and trailing slash
        const normalizedUrl = url.origin + 
            url.pathname.replace(/\/$/, '') + 
            url.search;
        
        // Additional validation
        if (!isValidUrl(normalizedUrl, logFilePath)) {
            log(`[ERROR] Normalization failed for URL: ${inputUrl}`, logFilePath);
            return null;
        }
        return normalizedUrl;
    } catch (error) {
        log(`[ERROR] Invalid URL: ${inputUrl} - Reason: ${error.message}`, logFilePath);
        return null;
    }
};

/**
 * Validate URL structure and protocol
 * @param {string} url - URL to validate
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {boolean} - Whether the URL is valid
 */
const isValidUrl = (url, logFilePath) => {
    try {
        const parsedUrl = new URL(url);
        const isValid = ['http:', 'https:'].includes(parsedUrl.protocol);
        if (!isValid) {
            log(`[ERROR] Invalid URL protocol: ${parsedUrl.protocol} for URL: ${url}`, logFilePath);
        }
        return isValid;
    } catch (error) {
        log(`[ERROR] URL validation failed for: ${url} - Reason: ${error.message}`, logFilePath);
        return false;
    }
};

/**
 * Extract hostname from a URL
 * @param {string} url - URL to extract hostname from
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {string|null} - Hostname or null if invalid
 */
const extractHostname = (url, logFilePath) => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (error) {
        log(`[ERROR] Failed to extract hostname from URL: ${url} - Reason: ${error.message}`, logFilePath);
        return null;
    }
};

/**
 * Ensure URL is absolute
 * @param {string} url - URL to make absolute
 * @param {string} baseUrl - Base URL to resolve against
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {string|null} - Absolute URL or null if invalid
 */
const resolveAbsoluteUrl = (url, baseUrl, logFilePath) => {
    try {
        const base = new URL(baseUrl);
        const absolute = new URL(url, base);
        return absolute.href;
    } catch (error) {
        log(`[ERROR] Failed to resolve absolute URL: ${url} against base: ${baseUrl} - Reason: ${error.message}`, logFilePath);
        return null;
    }
};

/**
 * Remove tracking and unnecessary parameters from a URL
 * @param {string} url - URL to clean
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {string} - Cleaned URL
 */
const cleanUrl = (url, logFilePath) => {
    try {
        const parsedUrl = new URL(url);
        
        // Remove common tracking parameters
        const trackingParams = [
            'utm_source', 
            'utm_medium', 
            'utm_campaign', 
            'utm_term', 
            'utm_content',
            'ref',
            'fbclid',
            'gclid',
            'pk_campaign',
            'pk_kwd',
            'zanpid',
            'origin'
        ];
        
        trackingParams.forEach(param => {
            parsedUrl.searchParams.delete(param);
        });
        
        // Reconstruct URL without tracking parameters
        const cleanedUrl = parsedUrl.origin + 
            parsedUrl.pathname.replace(/\/$/, '') + 
            (parsedUrl.search ? parsedUrl.search : '');
        
        return cleanedUrl;
    } catch (error) {
        log(`[ERROR] Failed to clean URL: ${url} - Reason: ${error.message}`, logFilePath);
        return url; // Return the original URL if cleaning fails
    }
};

/**
 * Compare two URLs for similarity
 * @param {string} url1 - First URL to compare
 * @param {string} url2 - Second URL to compare
 * @param {string} logFilePath - Path to the log file for logging
 * @returns {boolean} - Whether URLs are considered similar
 */
const areUrlsSimilar = (url1, url2, logFilePath) => {
    try {
        const normalizedUrl1 = normalizeUrl(url1, logFilePath);
        const normalizedUrl2 = normalizeUrl(url2, logFilePath);
        
        if (!normalizedUrl1 || !normalizedUrl2) {
            log(`[ERROR] One or both URLs are invalid: ${url1}, ${url2}`, logFilePath);
            return false;
        }
        
        const parsedUrl1 = new URL(normalizedUrl1);
        const parsedUrl2 = new URL(normalizedUrl2);
        
        // Compare hostname and pathname
        const isSimilar = parsedUrl1.hostname === parsedUrl2.hostname && 
                          parsedUrl1.pathname === parsedUrl2.pathname;
        if (!isSimilar) {
            log(`[INFO] URLs are not similar: ${url1} vs ${url2}`, logFilePath);
        }
        return isSimilar;
    } catch (error) {
        log(`[ERROR] Comparison failed for URLs: ${url1}, ${url2} - Reason: ${error.message}`, logFilePath);
        return false;
    }
};

export { 
    normalizeUrl, 
    isValidUrl, 
    extractHostname, 
    resolveAbsoluteUrl,
    cleanUrl,
    areUrlsSimilar
};

// end urlUtils.js
