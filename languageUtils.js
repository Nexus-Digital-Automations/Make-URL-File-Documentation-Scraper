// File: languageUtils.js
// Purpose: Language detection utility for web scraping
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]

import pkg from 'language-detect';
const { detect } = pkg;

import { LANGUAGE_FILTER_OPTIONS } from './config.js';
import { log } from './logger.js';

/**
 * Detect the language of a given text
 * @param {string} text - Text to detect language for
 * @param {string} logFilePath - Path to log file
 * @returns {Promise<string>} - Detected language code
 */
const detectLanguage = async (text, logFilePath = null) => {
    try {
        // Ensure minimum text length for reliable detection
        if (!text || text.length < 50) {
            log(`[WARN] Insufficient text for language detection`, logFilePath);
            return null;
        }

        // Perform language detection
        const detectedLanguage = await new Promise((resolve, reject) => {
            detect(text, (err, language) => {
                if (err) reject(err);
                else resolve(language);
            });
        });

        // Log detected language
        if (logFilePath) {
            log(`[INFO] Detected language: ${detectedLanguage}`, logFilePath);
        }

        // Check against allowed languages and confidence
        if (
            LANGUAGE_FILTER_OPTIONS.allowedLanguages.includes(detectedLanguage)
        ) {
            return detectedLanguage;
        }

        return null;
    } catch (error) {
        // Log any detection errors
        if (logFilePath) {
            log(`[ERROR] Language detection error: ${error.message}`, logFilePath);
        }
        return null;
    }
};

export { detectLanguage };
