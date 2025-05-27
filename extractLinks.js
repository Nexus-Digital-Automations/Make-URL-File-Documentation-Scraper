// File: extractLinks.js
// Purpose: Advanced link extraction utility for web scraping
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: 2025-02-15

import { log } from './logger.js';

/**
 * Extract links from a Puppeteer page
 * @param {Object} page - Puppeteer page instance
 * @param {string} logFilePath - Path to the log file
 * @returns {Promise<Array>} - Array of extracted links
 */
const extractLinks = async (page, logFilePath) => {
    try {
        const links = await page.evaluate(() => {
            // Define selectors for different types of links
            const linkSelectors = [
                'a[href]',           // Standard anchor links
                'area[href]',        // Image map links
                '[data-href]',       // Data attribute links
                'link[href]',        // Stylesheet and other links
                'script[src]'        // Script sources
            ];

            const extractedLinks = new Set(); // Use a Set to avoid duplicates

            // Iterate over each selector to extract links
            linkSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        // Get the href, data-href, or src attribute
                        let href = el.getAttribute('href') || 
                                   el.getAttribute('data-href') || 
                                   el.getAttribute('src');

                        if (href && href.trim()) {
                            try {
                                // Resolve the URL relative to the current page
                                const fullUrl = new URL(href, window.location.href).href;
                                extractedLinks.add(fullUrl); // Add the resolved URL to the Set
                            } catch (urlError) {
                                console.error(`URL resolution error: ${urlError.message}`);
                            }
                        }
                    });
                } catch (selectorError) {
                    console.error(`Error processing selector ${selector}:`, selectorError);
                }
            });

            return Array.from(extractedLinks); // Convert Set to Array and return
        });

        log(`[SUCCESS] Total links extracted: ${links.length}`, logFilePath);

        // Ensure the output is always an array
        return Array.isArray(links) ? links : []; // Return an empty array if links is not an array
    } catch (error) {
        log(`[CRITICAL] Link extraction error: ${error.message}`, logFilePath);
        log(`[CRITICAL] Error stack: ${error.stack}`, logFilePath);
        return []; // Return an empty array on error
    }
};

export { extractLinks };

// end extractLinks.js
