// File: crawlWebsite.js
// Purpose: Crawling functionality for the web scraping application
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';

import { 
    MAX_CONCURRENT_PAGES, 
    BROWSER_LAUNCH_OPTIONS,
    MAX_DEPTH
} from './config.js';
import { processUrl } from './processUrls.js';
import { log } from './logger.js';
import { normalizeUrl } from './urlUtils.js';

// Apply stealth plugin to enhance browser automation
puppeteer.use(StealthPlugin());

const crawlWebsite = async (startUrl, options) => {
    // Define default crawling options with fallback values
    const DEFAULT_OPTIONS = {
        outputFolder: './pdfs',           // Default PDF output directory
        logFilePath: './crawl.log',       // Default log file path
        maxConcurrent: MAX_CONCURRENT_PAGES, // Maximum concurrent page processing
        maxDepth: MAX_DEPTH,                      // Default maximum depth
        browser: null,                    // Allow passing an existing browser instance
        keywords: [],                     // Optional keywords for filtering
        outputFormat: 'pdf'               // Default output format
    };

    // Merge provided options with default options
    const FINAL_OPTIONS = { ...DEFAULT_OPTIONS, ...options };

    // Launch browser or use provided instance
    const browser = FINAL_OPTIONS.browser || await puppeteer.launch(BROWSER_LAUNCH_OPTIONS);
    
    // Initialize sets to track unique and visited URLs
    const UNIQUE_URLS = new Set();
    const VISITED_URLS = new Set();

    // Initialize crawl queue with start URL
    const QUEUE = [{ url: startUrl, depth: 0 }];
    UNIQUE_URLS.add(normalizeUrl(startUrl));
    
    // Log start of crawling process
    log(`Starting crawl from: ${startUrl}`, FINAL_OPTIONS.logFilePath);

    // Main crawling loop
    const activePromises = new Set(); // To keep track of active processing promises

    // Start processing URLs
    while (QUEUE.length > 0 || activePromises.size > 0) {
        // Fill the active promises up to the max concurrent limit
        while (activePromises.size < FINAL_OPTIONS.maxConcurrent && QUEUE.length > 0) {
            const { url, depth } = QUEUE.shift(); // Get the next URL from the queue

            if (VISITED_URLS.has(url)) {
                continue; // Skip if already visited
            }

            // Log current queue size before processing
            log(`[DEBUG] Current queue size before processing: ${QUEUE.length}`, FINAL_OPTIONS.logFilePath);
            log(`[DEBUG] Processing URL: ${url}`, FINAL_OPTIONS.logFilePath);
            
            const promise = processUrl(
                browser,
                url,
                FINAL_OPTIONS.outputFolder,
                FINAL_OPTIONS.logFilePath,
                UNIQUE_URLS,
                VISITED_URLS,
                new URL(options.baseUrl).href, // Pass the base URL correctly
                FINAL_OPTIONS.keywords,          // Pass keywords
                FINAL_OPTIONS.outputFormat       // Pass output format
            ).then(discoveredLinks => {
                // Add discovered links to queue for further processing
                discoveredLinks.forEach(link => {
                    if (!UNIQUE_URLS.has(link) && depth + 1 <= FINAL_OPTIONS.maxDepth) { // Check depth here
                        UNIQUE_URLS.add(link);
                        QUEUE.push({ url: link, depth: depth + 1 }); // Increment depth for new links
                    }
                });

                // Mark the URL as visited
                VISITED_URLS.add(url);
                activePromises.delete(promise); // Remove the completed promise from active set
            }).catch(error => {
                log(`[ERROR] Error processing URL ${url}: ${error.message}`, FINAL_OPTIONS.logFilePath);
                activePromises.delete(promise); // Remove the failed promise from active set
            });

            activePromises.add(promise); // Add the promise to the active set
        }

        // Wait for a short period to allow for new URLs to be processed
        await new Promise(resolve => setTimeout(resolve, 100)); // Adjust the delay as needed
    }

    // Close browser if not provided externally
    if (!FINAL_OPTIONS.browser) {
        await browser.close();
        log(`Browser closed successfully.`, FINAL_OPTIONS.logFilePath);
    }

    // Return discovered unique and visited URLs
    return {
        uniqueUrls: UNIQUE_URLS,
        visitedUrls: VISITED_URLS
    };
};

export { crawlWebsite };

// end crawlWebsite.js