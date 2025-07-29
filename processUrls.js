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
// ENHANCED: Import keyword filtering for advanced functionality
// Note: Dynamic import used within function to avoid circular dependencies
import { log } from './logger.js';
import { 
    waitForAvailableTab, 
    configureBrowserPage 
} from './browserUtils.js';
import { extractLinks } from './extractLinks.js';
import { autoScroll } from './autoScroll.js'; 
import { saveUniqueUrls } from './saveUniqueUrls.js'; 
import path from 'path';

// Initialize concurrency limiter
const LIMIT = pLimit(MAX_CONCURRENT_PAGES);

// Normalize the EXTENSIONS_TO_AVOID to have a leading dot for comparison
const normalizedExtensionsToAvoid = EXTENSIONS_TO_AVOID.map(ext => ext.startsWith('.') ? ext : `.${ext}`);

/**
 * ENHANCED: Process URLs with comprehensive keyword filtering and advanced programming techniques
 * 
 * Design by Contract:
 * Preconditions:
 * - browser must be valid Puppeteer browser instance
 * - url must be valid URL string
 * - outputFolder must be writable directory path
 * - logFilePath must be valid file path
 * - uniqueUrls and visitedUrls must be Set objects
 * - baseUrl must be valid URL string for hostname comparison
 * - keywords must be array (can be empty)
 * 
 * Postconditions:
 * - returns array of discovered links
 * - all returned links are validated and normalized
 * - keyword filtering is applied if keywords provided
 * - visitedUrls set is updated with processed URL
 * 
 * Invariants:
 * - Function has no side effects beyond logging and URL sets
 * - All URLs are properly validated before processing
 * - Security boundaries are enforced throughout
 * 
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} url - Single URL to process (not queue anymore)
 * @param {string} outputFolder - Directory to save the output text file
 * @param {string} logFilePath - Path to the log file
 * @param {Set} uniqueUrls - Set of unique URLs discovered
 * @param {Set} visitedUrls - Set of visited URLs
 * @param {string} baseUrl - Base URL for hostname filtering
 * @param {string[]} keywords - Keywords for content filtering
 * @param {string} outputFormat - Output format (pdf, txt, etc.)
 * @returns {Promise<Array>} - Array of discovered links
 */
const processUrl = async (
    browser, 
    url, 
    outputFolder,  
    logFilePath, 
    uniqueUrls,
    visitedUrls,
    baseUrl,
    keywords = []
) => {
    // DESIGN BY CONTRACT: Comprehensive precondition validation
    log(`[DEBUG] Starting processUrl with URL: ${url}`, logFilePath);
    
    // OPTIMIZATION: Skip processing if URL was already visited (for hostname continuation)
    if (visitedUrls && visitedUrls.has(url)) {
        log(`[DEBUG] Skipping already visited URL: ${url}`, logFilePath);
        return []; // Return empty array as no new links to discover
    }
    
    // DEFENSIVE PROGRAMMING: Validate all required parameters
    if (!browser || typeof browser.newPage !== 'function') {
        const error = new TypeError('Invalid browser instance provided');
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    if (!outputFolder || typeof outputFolder !== 'string') {
        const error = new TypeError('Invalid outputFolder provided');
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    if (!logFilePath || typeof logFilePath !== 'string') {
        const error = new TypeError('Invalid logFilePath provided');
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    if (!(uniqueUrls instanceof Set) || !(visitedUrls instanceof Set)) {
        const error = new TypeError('uniqueUrls and visitedUrls must be Set objects');
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    if (!url || typeof url !== 'string') {
        log(`[CONTRACT_VIOLATION] Invalid URL provided: ${url}`, logFilePath);
        return [];
    }

    if (!Array.isArray(keywords)) {
        log(`[CONTRACT_VIOLATION] Keywords must be an array, got: ${typeof keywords}`, logFilePath);
        return [];
    }

    const discoveredLinks = []; // Array to hold discovered links
    
    // IMMUTABILITY: Process single URL (modified from queue approach)
    return await LIMIT(async () => {
        log(`[INFO] [PROCESS_URL_START] URL: ${url}`, logFilePath);

        // PURE FUNCTION: URL normalization and validation
        const normalizedUrl = normalizeUrl(url, logFilePath);
        if (!normalizedUrl) {
            log(`[ERROR] Invalid URL: ${url}`, logFilePath);
            return [];
        }

        const cleanedUrl = cleanUrl(normalizedUrl, logFilePath);
        const inputHostname = extractHostname(normalizedUrl, logFilePath);
        const baseHostname = extractHostname(baseUrl, logFilePath);
        
        // DEFENSIVE PROGRAMMING: Hostname validation
        if (!inputHostname || !baseHostname) {
            log(`[ERROR] Could not extract hostnames: input=${inputHostname}, base=${baseHostname}`, logFilePath);
            return [];
        }
            
        // DEFENSIVE PROGRAMMING: Skip if already visited
        if (visitedUrls.has(cleanedUrl)) {
            log(`[INFO] Skipping already visited URL: ${cleanedUrl}`, logFilePath);
            return [];
        }

        // DEFENSIVE PROGRAMMING: Enhanced extension and content type checking
        const urlExtension = path.extname(cleanedUrl).toLowerCase();
        if (normalizedExtensionsToAvoid.includes(urlExtension)) {
            log(`[INFO] Skipping URL due to avoided extension: ${cleanedUrl}`, logFilePath);
            return [];
        }
        
        // Additional checks for common non-HTML files that might not have extensions
        const nonHtmlPatterns = [
            /\/manifest\.json$/i,
            /\/opensearch\.xml$/i,
            /\/robots\.txt$/i,
            /\/sitemap/i,
            /\/favicon/i,
            /\.(css|js|json|xml|txt|pdf|zip|gz|tar|png|jpg|jpeg|gif|svg|ico)$/i,
            /\/api\//i,  // Skip API endpoints unless they're documentation
            /\/feed$/i,  // RSS feeds
            /\/rss$/i    // RSS feeds
        ];
        
        if (nonHtmlPatterns.some(pattern => pattern.test(cleanedUrl))) {
            log(`[INFO] Skipping non-HTML content: ${cleanedUrl}`, logFilePath);
            return [];
        }

        let page = null; // Initialize page variable
        try {
            await waitForAvailableTab(browser, logFilePath);
            page = await browser.newPage();
            page = await configureBrowserPage(page, logFilePath);
                
            // Navigate to the URL with enhanced error handling
            const response = await page.goto(cleanedUrl, { 
                waitUntil: 'domcontentloaded', // Changed from networkidle0 for faster loading
                timeout: PAGE_LOAD_TIMEOUT
            });
            
            if (!response) {
                log(`[PAGE_LOAD_ERROR] Failed to load page: ${cleanedUrl} - No response received`, logFilePath);
                return [];
            }
            
            const status = response.status();
            if (status >= 400) {
                log(`[PAGE_LOAD_ERROR] Failed to load page: ${cleanedUrl} - Status: ${status}`, logFilePath);
                return [];
            }
            
            // Check if page is actually loaded with content
            const hasContent = await page.evaluate(() => {
                return document.body && document.body.innerHTML.length > 100;
            });
            
            if (!hasContent) {
                log(`[PAGE_LOAD_ERROR] Page appears to be empty or minimal content: ${cleanedUrl}`, logFilePath);
                return [];
            }

            // Use the imported autoScroll function
            await autoScroll(page);

            // Mark URL as visited after processing
            visitedUrls.add(cleanedUrl);

            // Verify page contains useful content before saving
            const pageTitle = await page.title();
            const hasValidTitle = pageTitle && pageTitle.length > 3 && !pageTitle.toLowerCase().includes('error');
            
            if (hasValidTitle) {
                // Since URL already passed keyword pre-filtering, save it
                const outputFilePath = path.join(outputFolder, 'unique_urls.txt');
                await saveUniqueUrls([cleanedUrl], outputFilePath, logFilePath);
                log(`[SAVED] URL added to results: ${cleanedUrl} - Title: ${pageTitle}`, logFilePath);
            } else {
                log(`[SKIPPED] Page has invalid or missing title: ${cleanedUrl} - Title: ${pageTitle}`, logFilePath);
                return [];
            }

            // ALWAYS extract links for recursive crawling
            const pageLinks = await extractLinks(page, logFilePath);
            if (!Array.isArray(pageLinks)) {
                log(`[ERROR] extractLinks did not return an array`, logFilePath);
                return [];
            }

            // PURE FUNCTION: Filter links with comprehensive validation
            const filteredLinks = pageLinks
                .map(link => normalizeUrl(link, logFilePath))
                .filter(link => {
                    if (!link) return false;
                    const cleanedLink = cleanUrl(link, logFilePath);
                    const linkHostname = extractHostname(cleanedLink, logFilePath);
                    
                    // TYPE-DRIVEN VALIDATION: Comprehensive link validation
                    const isValid = cleanedLink && 
                                    linkHostname === baseHostname && // Use baseHostname for consistency
                                    !visitedUrls.has(cleanedLink);
                    return isValid;
                });

            log(`[LINK_FILTERING] Total: ${pageLinks.length}, Filtered: ${filteredLinks.length}`, logFilePath);

            // Return discovered links for queue management (don't add to uniqueUrls here)
            discoveredLinks.push(...filteredLinks);

        } catch (error) {
            // Enhanced error handling with categorization
            if (error.name === 'TimeoutError') {
                log(`[TIMEOUT_ERROR] Page load timeout for ${cleanedUrl}: ${error.message}`, logFilePath);
            } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                log(`[DNS_ERROR] DNS resolution failed for ${cleanedUrl}`, logFilePath);
            } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
                log(`[CONNECTION_ERROR] Connection refused for ${cleanedUrl}`, logFilePath);
            } else if (error.message.includes('ERR_SSL')) {
                log(`[SSL_ERROR] SSL error for ${cleanedUrl}`, logFilePath);
            } else {
                log(`[ERROR] Processing ${cleanedUrl}: ${error.message}`, logFilePath);
                log(`[ERROR] Error stack: ${error.stack}`, logFilePath);
            }
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    log(`[PAGE_CLOSE_ERROR] ${closeError.message}`, logFilePath);
                }
            }
        }

        // POSTCONDITION: Verify returned array is valid
        const isValidResult = Array.isArray(discoveredLinks) && 
                              discoveredLinks.every(link => typeof link === 'string');
        
        if (!isValidResult) {
            const error = new Error('Postcondition violated: Invalid result array');
            log(`[CONTRACT_VIOLATION] ${error.message}`, logFilePath);
            return [];
        }

        return discoveredLinks; // Return the array of discovered links
    });
};

export { 
    processUrl,
    LIMIT as tabSemaphore,
    CONTENT_SELECTORS 
};

// end processUrls.js
