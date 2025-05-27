// File: saveUniqueUrls.js
// Purpose: Save unique URLs to a file
// Author: Jeremy Parker
// Created: 2025-02-15
// Last Modified: 2025-02-15

import fs from 'fs';
import path from 'path';
import { cleanUrl } from './urlUtils.js';
import { log } from './logger.js';

/**
 * Save unique URLs to file
 * @param {Array<string>} links - Array of URLs to save
 * @param {string} outputFilePath - Path to output file
 * @param {string} logFilePath - Path to log file
 */
const saveUniqueUrls = (links, outputFilePath, logFilePath) => {
    log(`[DEBUG] Starting to save unique URLs to file: ${outputFilePath}`, logFilePath);
    if (!Array.isArray(links)) {
        log(`[ERROR] Cannot save links: input is not an array`, logFilePath);
        return;
    }

    try {
        // Ensure the output directory exists
        const outputFolder = path.dirname(outputFilePath);
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
            log(`[INFO] Created output directory: ${outputFolder}`, logFilePath);
        }

        // Read existing URLs
        const existingUrls = new Set(
            fs.existsSync(outputFilePath) 
                ? fs.readFileSync(outputFilePath, 'utf8').split('\n').filter(Boolean) 
                : []
        );

        // Write new unique links
        let newUrlsCount = 0;
        links.forEach(link => {
            const cleanedLink = cleanUrl(link);
            if (cleanedLink && !existingUrls.has(cleanedLink)) {
                fs.appendFileSync(outputFilePath, cleanedLink + '\n', 'utf8');
                existingUrls.add(cleanedLink);
                newUrlsCount++;
            }
        });

        log(`[INFO] Saved ${newUrlsCount} new unique URLs to: ${outputFilePath}`, logFilePath);
    } catch (error) {
        log(`[ERROR] Failed to save URLs: ${error.message}`, logFilePath);
    }
};

export { saveUniqueUrls };

// end saveUniqueUrls.js
