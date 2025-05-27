// File: main.js
// Purpose: Entry point for the web scraping application
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

// Import required dependencies
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';

// Import configurations and utilities
import {
    MAX_CONCURRENT_PAGES,
    BROWSER_LAUNCH_OPTIONS,
    LOG_BASE_PATH,
    MAX_DEPTH // Importing MAX_DEPTH from config.js
} from './config.js';
import { log, createChildLogger } from './logger.js';
import { crawlWebsite } from './crawlWebsite.js';
import { generateValidatedUserAgent } from './userAgentUtils.js';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

(async () => {
    let BROWSER = null;
    let LOG_FILE_PATH = null;
    let OUTPUT_FOLDER = null;

    try {
        // Validate LOG_BASE_PATH
        if (!LOG_BASE_PATH) {
            console.error('LOG_BASE_PATH is not defined in config.js');
            process.exit(1);
        }

        // Ensure log base path exists
        if (!fs.existsSync(LOG_BASE_PATH)) {
            fs.mkdirSync(LOG_BASE_PATH, { recursive: true });
        }

        // Parse input arguments
        const INPUT_ARGS = process.argv.slice(2);
        if (INPUT_ARGS.length < 1) {
            console.error('Please provide an actual URL as an argument.');
            process.exit(1);
        }

        // The first argument is the actual URL to open
        const ACTUAL_URL = new URL(INPUT_ARGS[0]);
        const BASE_URL_HREF = ACTUAL_URL.href;

        // Create output folder with hostname
        const HOSTNAME = ACTUAL_URL.hostname.replace(/\./g, '_');
        const TIMESTAMP = Date.now();
        OUTPUT_FOLDER = path.join(LOG_BASE_PATH, `${HOSTNAME}_${TIMESTAMP}`);

        // Create output folder
        fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
        fs.mkdirSync(path.join(OUTPUT_FOLDER, 'texts'), { recursive: true });

        // Create a log file for this session in the output folder
        const LOG_FILE_NAME = `${HOSTNAME}_${TIMESTAMP}.log`;
        LOG_FILE_PATH = path.join(OUTPUT_FOLDER, LOG_FILE_NAME);

        // Log start of scraping
        const childLog = createChildLogger(LOG_FILE_PATH);
        childLog(`Starting web scraping for: ${BASE_URL_HREF}`, { logLevel: 'INFO' });
        childLog(`Output Folder: ${OUTPUT_FOLDER}`, { logLevel: 'INFO' });

        // Generate a validated user agent
        const USER_AGENT = generateValidatedUserAgent(5, LOG_FILE_PATH);
        childLog(`Using User Agent: ${USER_AGENT}`, { logLevel: 'DEBUG' });

        // Launch browser with stealth and custom options
        BROWSER = await puppeteer.launch({
            ...BROWSER_LAUNCH_OPTIONS,
            args: [
                ...BROWSER_LAUNCH_OPTIONS.args,
                `--user-agent=${USER_AGENT}`
            ]
        });

        // Crawling options
        const CRAWL_OPTIONS = {
            outputFolder: path.join(OUTPUT_FOLDER, 'texts'), // Always save to texts subfolder
            logFilePath: LOG_FILE_PATH,
            maxDepth: MAX_DEPTH, // Set to 100 as defined in config.js
            browser: BROWSER,
            keywords: [], // No keywords for this example
            baseUrl: BASE_URL_HREF, // Pass the base URL here
            uniqueUrls: new Set(), // Start with an empty unique URLs set
            visitedUrls: new Set()  // Start with an empty visited URLs set
        };

        // Start crawling from the actual URL
        const CRAWL_RESULTS = await crawlWebsite(ACTUAL_URL.href, CRAWL_OPTIONS);

        // Log crawling results
        childLog(`Unique URLs discovered: ${CRAWL_RESULTS.uniqueUrls.size}`, { logLevel: 'SUCCESS' });
        childLog(`Visited URLs: ${CRAWL_RESULTS.visitedUrls.size}`, { logLevel: 'SUCCESS' });

        // Optional: Log discovered URLs
        if (CRAWL_RESULTS.uniqueUrls.size > 0) {
            childLog('Discovered URLs:', { logLevel: 'INFO' });
            CRAWL_RESULTS.uniqueUrls.forEach(url => childLog(url, { logLevel: 'INFO' }));
        }

        childLog('Scraping completed successfully', { logLevel: 'SUCCESS' });
    } catch (error) {
        // Comprehensive error logging
        const errorLog = createChildLogger(LOG_FILE_PATH || path.join(LOG_BASE_PATH, 'error.log'));
        errorLog(`Critical error during scraping: ${error.message}`, { logLevel: 'ERROR' });
        errorLog(`Error stack: ${error.stack}`, { logLevel: 'ERROR' });
        console.error('An error occurred:', error);
        process.exit(1);
    } finally {
        // Ensure browser is closed
        if (BROWSER) {
            try {
                await BROWSER.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
    }
})();

// end main.js
