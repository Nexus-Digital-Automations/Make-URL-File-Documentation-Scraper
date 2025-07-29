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
import { shouldVisitUrl } from './smartUrlFilter.js';

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

            // ENHANCED: Use smart URL filter to avoid problematic URLs
            const filterOptions = {
                keywords: FINAL_OPTIONS.keywords
            };
            
            const shouldVisit = shouldVisitUrl(url, FINAL_OPTIONS.baseUrl || startUrl, filterOptions, FINAL_OPTIONS.logFilePath);
            
            if (!shouldVisit) {
                VISITED_URLS.add(url); // Mark as visited to avoid reprocessing
                continue; // Skip to next URL
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
            FINAL_OPTIONS.baseUrl || startUrl, // Use consistent baseUrl
            FINAL_OPTIONS.keywords,          // Pass keywords
            FINAL_OPTIONS.outputFormat       // Pass output format
            ).then(discoveredLinks => {
                log(`[DEBUG] processUrl returned ${discoveredLinks.length} discovered links`, FINAL_OPTIONS.logFilePath);
                
                // Add discovered links to queue for further processing (with smart filtering)
                let queuedCount = 0;
                let filteredCount = 0;
                
                discoveredLinks.forEach(link => {
                    if (!UNIQUE_URLS.has(link) && depth + 1 <= FINAL_OPTIONS.maxDepth) {
                        // Apply smart filter to newly discovered links
                        const linkFilterOptions = {
                            keywords: FINAL_OPTIONS.keywords
                        };
                        
                        const shouldVisitDiscoveredLink = shouldVisitUrl(link, FINAL_OPTIONS.baseUrl || startUrl, linkFilterOptions, FINAL_OPTIONS.logFilePath);
                        
                        if (shouldVisitDiscoveredLink) {
                            UNIQUE_URLS.add(link);
                            QUEUE.push({ url: link, depth: depth + 1 });
                            queuedCount++;
                            log(`[DEBUG] Queued for processing: ${link}`, FINAL_OPTIONS.logFilePath);
                        } else {
                            filteredCount++;
                            log(`[DEBUG] Filtered out discovered link: ${link}`, FINAL_OPTIONS.logFilePath);
                        }
                    } else {
                        log(`[DEBUG] Skipped queuing (duplicate or max depth): ${link}`, FINAL_OPTIONS.logFilePath);
                    }
                });
                
                log(`[DEBUG] Added ${queuedCount} new URLs to queue. Filtered out ${filteredCount} URLs. Queue size now: ${QUEUE.length}`, FINAL_OPTIONS.logFilePath);

                // Mark the URL as visited
                VISITED_URLS.add(url);
                activePromises.delete(promise); // Remove the completed promise from active set
            }).catch(error => {
                log(`[ERROR] Error processing URL ${url}: ${error.message}`, FINAL_OPTIONS.logFilePath);
                log(`[ERROR] Error stack: ${error.stack}`, FINAL_OPTIONS.logFilePath);
                VISITED_URLS.add(url); // Mark as visited even if failed to avoid retry loops
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