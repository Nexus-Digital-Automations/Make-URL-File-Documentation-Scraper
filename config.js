// File: config.js
// Purpose: Centralized configuration management for web scraping project
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

// Logging utility import for potential configuration-related logging
import { log } from './logger.js';

// Concurrent Processing Configuration
// Controls the maximum number of concurrent browser pages and recursion depth
export const MAX_CONCURRENT_PAGES = 7;
export const MAX_DEPTH = 100;

// Timeout Settings
// Define global timeout values for navigation and page loading
export const NAVIGATION_TIMEOUT = 60000; // 60 seconds
export const PAGE_LOAD_TIMEOUT = 60000; // 60 seconds

// PDF Generation Settings
// Standardized configuration for PDF export
export const PDF_GENERATION_OPTIONS = {
    format: 'A4',           // Standard paper size
    printBackground: true,  // Include background colors/images
    margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
    }
};

export const EXTENSIONS_TO_AVOID = ['.css', '.jpeg', '.jpg', '.png', '.js', '.gif', '.svg',
    '.xml', '.json', ',mp3', '.mp4', 
    'zip', '.rar', '.tar', '.gz', '.mov', '.its'];


// Logging Configuration
// Centralized log storage location
export const LOG_BASE_PATH = '/Users/jeremyparker/Documents/URLs_To_Scrape';

// Browser Launch Options
// Comprehensive browser configuration for web scraping
export const BROWSER_LAUNCH_OPTIONS = {
    headless: true,        // Show browser during scraping for debugging
    defaultViewport: {
        width: 1440, // Set your desired width
        height: 900, // Set your desired height
    },
    args: [
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--no-crash-upload',
        '--enable-strict-mixed-content-checking',
        '--block-new-web-contents',
        '--disable-client-side-phishing-detection',
        '--disable-features=DownloadsUI',
        '--disable-popup-blocking',
        '--disable-background-networking',
        '--disable-downloads',
        '--disable-downloads-extension',
        '--disable-file-system',
        '--disable-remote-fonts',
        '--disable-background-timer-throttling',
        '--metrics-recording-only',
        '--disable-permissions-api',
        '--disable-setuid-sandbox',
        '--js-flags="--noexpose_wasm"',
        '--disable-webgl',
        '--disable-storage-reset',
        '--disable-cache',
        '--disable-dev-shm-usage',
        '--disable-background-downloads',
        '--disable-component-update',
        '--disable-remote-fonts',
        '--disable-font-loading',
        '--disable-webfonts-service',
        '--mute-audio'
    ],
    protocolTimeout: 6000000 // Increase timeout to 60 seconds
};

// URL Filtering Options
export const URL_FILTER_OPTIONS = {
    excludePatterns: [
        /header/i,
        /footer/i,
        /nav/i,
        /menu/i
    ],
    invalidUrlPrefixes: [
        'javascript:',
        '#',
        'mailto:',
        'data:',
        'tel:',
        'blob:',
        'chrome-extension:',
        'about:'
    ]
};

// User Agent Generation Options
// Provide variety for browser user agent simulation
export const USER_AGENT_OPTIONS = {
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    platforms: [
        'Windows NT 10.0',
        'Macintosh; Intel Mac OS X 10_15_7',
        'X11; Linux x86_64',
        'iPhone; CPU iPhone OS 14_4 like Mac OS X',
        'Android 11; Mobile'
    ]
};

// Error Handling Configuration
// Define retry and delay strategies for error recovery
export const ERROR_HANDLING = {
    maxRetries: 3,          // Number of retry attempts
    retryDelay: 1000        // Delay between retries (ms)
};

// Resource Monitoring Configuration
// Monitor and manage browser resource consumption
export const RESOURCE_MONITORING = {
    memoryThresholdMB: 500,     // Memory threshold for cleanup
    cleanupIntervalMS: 60000    // Cleanup interval (ms)
};

// Optional: Configuration validation function
// Can be used to validate configuration at runtime
export const validateConfiguration = () => {
    try {
        // Add validation logic for critical configuration parameters
        if (MAX_CONCURRENT_PAGES <= 0) {
            throw new Error('MAX_CONCURRENT_PAGES must be positive');
        }

        if (LOG_BASE_PATH.trim() === '') {
            throw new Error('LOG_BASE_PATH cannot be empty');
        }

        // Log successful validation
        log('Configuration validated successfully', './config_validation.log', {
            logLevel: 'INFO'
        });

        return true;
    } catch (error) {
        // Log configuration validation errors
        log(`Configuration validation error: ${error.message}`, './config_validation.log', {
            logLevel: 'ERROR'
        });
        return false;
    }
};


// Add to existing config.js
export const LANGUAGE_FILTER_OPTIONS = {
    allowedLanguages: ['en-US'], // Only allow US English
    minimumConfidence: 0.7       // Minimum confidence for language detection
};

// List of selectors to extract main content
export const CONTENT_SELECTORS = [
    'main',
    '.main-content',
    '.content',
    '.article',
    '.post',
    '#content',
    '.entry',
    '.primary-content',
    '.page-content',
    '.blog-post',
    '.article-content',
    '.post-content',
    '.main-body',
    '.content-area',
    '.entry-content',
    '.wrapper',
    '.container',
    '.content-wrapper',
    '.site-content',
    '.content-section',
    '.main-section',
    '.content-main',
    '.body-content',
    '.content-block',
    '.content-inner',
    '.content-list',
    '.content-item',
    '.content-detail',
    '.content-body',
    '.content-box',
    '.content-area',
    '.content-region',
    '.content-column',
    '.content-grid',
    '.content-row',
    '.content-wrapper',
    '.content-container',
    '.content-section',
    '.content-main',
    '.content-primary',
    '.content-secondary',
    '.content-tertiary',
    '.content-quaternary',
    '.content-quinary',
    '.content-senary',
    '.content-septenary',
    '.content-octonary',
    '.content-nonary',
    '.content-denary',
    '.content-undecimal',
    '.content-duodecimal',
    '.content-tridecimal',
    '.content-quattuordecimal',
    '.content-quindecimal',
    '.content-sexdecimal',
    '.content-septendecimal',
    '.content-octodecimal',
    '.content-nonadecimal',
    '.content-vigintdecimal'
];



// Optionally validate configuration on import
validateConfiguration();

// end config.js
