// File: autoScroll.js
// Purpose: Provide an auto-scroll function for Puppeteer pages
// Author: Jeremy Parker
// Created: 2025-02-15
// Last Modified: 2025-02-15

/**
 * Auto-scroll function to scroll to the bottom of the page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>}
 */
const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 1000; // Distance to scroll each time
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight; // Total height of the document
                window.scrollBy(0, distance); // Scroll down by the specified distance
                totalHeight += distance; // Update the total height scrolled

                // If we've scrolled to the bottom, stop the interval
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve(); // Resolve the promise when done
                }
            }, 100); // Interval time in milliseconds
        });
    });
};

export { autoScroll };

// End of autoScroll.js
