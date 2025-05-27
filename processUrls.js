// File: processUrls.js
// Purpose: Process URLs for scraping and outputting to a text file
// Author: Jeremy Parker
// Created: 2025-02-15
// Last Modified: 2025-02-15

import pLimit from 'p-limit';
import { 
    MAX_CONCURRENT_PAGES, 
    PAGE_LOAD_TIMEOUT,
    CONTENT_SELECTORS,
    EXTENSIONS_TO_AVOID 
} from './config.js';
import { 
    normalizeUrl, 
    cleanUrl, 
    extractHostname 
} from './urlUtils.js';
import { log } from './logger.js';
import { 
    waitForAvailableTab, 
    configureBrowserPage 
} from './browserUtils.js';
import { extractLinks } from './extractLinks.js';
import { autoScroll } from './autoScroll.js'; 
import { saveUniqueUrls } from './saveUniqueUrls.js'; 
import fs from 'fs';
import path from 'path';

// Initialize concurrency limiter
const LIMIT = pLimit(MAX_CONCURRENT_PAGES);

// Normalize the EXTENSIONS_TO_AVOID to have a leading dot for comparison
const normalizedExtensionsToAvoid = EXTENSIONS_TO_AVOID.map(ext => ext.startsWith('.') ? ext : `.${ext}`);

/**
 * Process URLs for scraping and outputting to a text file.
 * @param {Object} browser - Puppeteer browser instance.
 * @param {Array|string} queue - The list of URLs to choose from.
 * @param {string} outputFolder - Directory to save the output text file.
 * @param {string} logFilePath - Path to the log file.
 * @param {Set} visitedUrls - Set of visited URLs.
 * @returns {Promise<Array>} - Array of discovered links.
 */
const processUrl = async (
    browser, 
    queue, 
    outputFolder,  
    logFilePath, 
    visitedUrls
) => {
    log(`[DEBUG] Starting processUrl with queue: ${JSON.stringify(queue)}`, logFilePath);
    
    // Validate required parameters
    if (!browser || !outputFolder || !logFilePath || !visitedUrls) {
        log(`[ERROR] Missing required parameters`, logFilePath);
        return [];
    }

    // Ensure queue is an array
    let urlQueue = Array.isArray(queue) ? [...queue] : 
                  typeof queue === 'string' ? [queue] : [];

    if (urlQueue.length === 0) {
        log(`[ERROR] Empty or invalid URL queue`, logFilePath);
        return [];
    }

    const discoveredLinks = []; // Array to hold discovered links

    // Use Promise.all to process URLs concurrently
    const processingTasks = urlQueue.map(inputUrl => 
        LIMIT(async () => {
            log(`[INFO] [PROCESS_URL_START] URL: ${inputUrl}`, logFilePath);

            const normalizedUrl = normalizeUrl(inputUrl);
            if (!normalizedUrl) {
                log(`[ERROR] Invalid URL: ${inputUrl}`, logFilePath);
                return;
            }

            const cleanedUrl = cleanUrl(normalizedUrl);
            const inputHostname = extractHostname(normalizedUrl);
            
            // If the URL has been visited and we have multiple URLs, skip
            if (visitedUrls.has(cleanedUrl) && urlQueue.length > 1) {
                return;
            }

            // Check if the URL has an extension to avoid
            const urlExtension = path.extname(cleanedUrl).toLowerCase();
            if (normalizedExtensionsToAvoid.includes(urlExtension)) {
                log(`[INFO] Skipping URL due to avoided extension: ${cleanedUrl}`, logFilePath);
                return;
            }

            let page = null; // Initialize page variable
            try {
                await waitForAvailableTab(browser, logFilePath);
                page = await browser.newPage();
                page = await configureBrowserPage(page, logFilePath);
                
                // Navigate to the URL and wait for navigation to complete
                const response = await page.goto(cleanedUrl, { 
                    waitUntil: 'networkidle0',
                    timeout: PAGE_LOAD_TIMEOUT
                });
                
                if (!response || !response.ok()) {
                    log(`[PAGE_LOAD_ERROR] Failed to load page: ${cleanedUrl} - Status: ${response ? response.status() : 'No response'}`, logFilePath);
                    return;
                }

                // Use the imported autoScroll function
                await autoScroll(page);

                // Mark URL as visited after processing
                visitedUrls.add(cleanedUrl);

                // Extract and process links
                const pageLinks = await extractLinks(page, logFilePath);
                if (!Array.isArray(pageLinks)) {
                    log(`[ERROR] extractLinks did not return an array`, logFilePath);
                    return;
                }

                // Filter links
                const filteredLinks = pageLinks
                    .map(link => normalizeUrl(link))
                    .filter(link => {
                        if (!link) return false;
                        const cleanedLink = cleanUrl(link);
                        const isValid = cleanedLink && 
                                        extractHostname(cleanedLink) === inputHostname &&
                                        !visitedUrls.has(cleanedLink);
                        return isValid;
                    });

                log(`[LINK_FILTERING] Total: ${pageLinks.length}, Filtered: ${filteredLinks.length}`, logFilePath);

                // Save filtered links
                const outputFilePath = path.join(outputFolder, 'unique_urls.txt');
                await saveUniqueUrls(filteredLinks, outputFilePath, logFilePath);

                // Add discovered links to the array
                discoveredLinks.push(...filteredLinks);

            } catch (error) {
                log(`[ERROR] Processing ${cleanedUrl}: ${error.message}`, logFilePath);
            } finally {
                if (page) {
                    try {
                        await page.close();
                    } catch (closeError) {
                        log(`[PAGE_CLOSE_ERROR] ${closeError.message}`, logFilePath);
                    }
                }
            }
        })
    );

    // Wait for all processing tasks to complete
    await Promise.all(processingTasks);

    return discoveredLinks; // Return the array of discovered links
};

export { 
    processUrl,
    LIMIT as tabSemaphore,
    CONTENT_SELECTORS 
};

// end processUrls.js
