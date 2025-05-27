// File: shuffleArray.js
// Purpose: Shuffle an array in place using the Fisher-Yates algorithm
// Author: Jeremy Parker
// Created: 2025-02-15
// Last Modified: 2025-02-15

import { log } from './logger.js';

/**
 * Shuffle an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @param {string} logFilePath - Path to the log file for logging.
 */

const shuffleArray = (array, logFilePath) => {
    if (!Array.isArray(array)) {
        log(`[ERROR] Cannot shuffle: input is not an array`, logFilePath);
        return;
    }
    log(`[INFO] [SHUFFLE_START] Shuffling array of length: ${array.length}`, logFilePath);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    log(`[INFO] [SHUFFLE_END] Shuffling complete`, logFilePath);
};

export { shuffleArray };

// end shuffleArray.js
