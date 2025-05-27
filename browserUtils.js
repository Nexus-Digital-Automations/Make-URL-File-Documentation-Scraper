// File: browserUtils.js
// Purpose: Browser tab and resource management utilities for web scraping
// Author: Jeremy Parker
// Created: [Current Date]
// Last Modified: [Current Date]
import { MAX_CONCURRENT_PAGES, RESOURCE_MONITORING } from './config.js';
import { log } from './logger.js';
/**
 * Get the current number of open browser tabs
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 * @returns {Promise<number>} - Number of active tabs
 */
const getOpenTabCount = async (browser, logFilePath) => {
    try {
        // Retrieve all pages and count non-closed tabs
        const pages = await browser.pages();
        const activePagesCount = pages.filter(page => !page.isClosed()).length;
        
        // Log the current number of active tabs
        log(`Current active tabs: ${activePagesCount}`, logFilePath, { 
            logLevel: 'DEBUG' 
        });
        
        return activePagesCount;
    } catch (error) {
        // Log any errors encountered while getting tab count
        log(`Error getting open tab count: ${error.message}`, logFilePath, { 
            logLevel: 'ERROR' 
        });
        return 0;
    }
};
/**
 * Wait for an available browser tab
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 * @param {number} [MAX_TABS=MAX_CONCURRENT_PAGES] - Maximum number of concurrent tabs
 * @param {number} [MAX_WAIT_TIME=15000] - Maximum wait time in milliseconds
 * @throws {Error} - If maximum wait time is exceeded
 */
const waitForAvailableTab = async (
    browser, 
    logFilePath, 
    MAX_TABS = MAX_CONCURRENT_PAGES,
    MAX_WAIT_TIME = 10000
) => {
    const START_TIME = Date.now();
    
    while (true) {
        // Check if wait time has been exceeded
        if (Date.now() - START_TIME > MAX_WAIT_TIME) {
            log(`Maximum wait time exceeded for available tab`, logFilePath, { 
                logLevel: 'WARN' 
            });
            throw new Error('Maximum wait time for available tab exceeded');
        }
        
        // Get current number of open tabs
        const OPEN_TABS = await getOpenTabCount(browser, logFilePath);
        
        // If number of tabs is below maximum, return
        if (OPEN_TABS < MAX_TABS) {
            return;
        }
        
        // Implement exponential backoff with jitter
        const BASE_DELAY = 1000; // 1 second
        const JITTER = Math.random() * 500; // Up to 0.5 seconds of randomness
        const DELAY = BASE_DELAY + JITTER;
        
        // Log waiting status
        log(`Waiting for available tab. Current tabs: ${OPEN_TABS}`, logFilePath, { 
            logLevel: 'INFO' 
        });
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, DELAY));
    }
};
/**
 * Configure a browser page with standard settings
 * @param {Object} page - Puppeteer page instance
 * @param {string} logFilePath - Path to the log file
 * @returns {Promise<Object>} - Configured page
 */
const configureBrowserPage = async (page, logFilePath) => {
    try {
        // Modify request interception to be less restrictive
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const blockedTypes = ['font']; // Only block fonts
            
            if (blockedTypes.includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set standard viewport
        await page.setViewport({ width: 1920, height: 900 });
        
        // Add additional navigation timeout settings
        await page.setDefaultNavigationTimeout(60000); // 60 seconds
        await page.setDefaultTimeout(60000); // 60 seconds

        log('Browser page configured successfully', logFilePath, { logLevel: 'DEBUG' });
        return page;
    } catch (error) {
        log(`Error configuring browser page: ${error.message}`, logFilePath, { logLevel: 'ERROR' });
        throw error;
    }
};

/**
 * Close excess browser tabs
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 * @param {number} maxTabs - Maximum number of tabs to keep open
 */
const closeExcessTabs = async (browser, logFilePath, maxTabs = MAX_CONCURRENT_PAGES) => {
    try {
        const pages = await browser.pages();
        const excessTabs = pages.slice(maxTabs);
        
        for (const page of excessTabs) {
            if (!page.isClosed()) {
                await page.close();
                log(`Closed excess tab`, logFilePath, { logLevel: 'DEBUG' });
            }
        }
    } catch (error) {
        log(`Error closing excess tabs: ${error.message}`, logFilePath, { logLevel: 'ERROR' });
    }
};
/**
 * Monitor browser resource consumption
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 */
const monitorBrowserResources = async (browser, logFilePath) => {
    try {
        const pages = await browser.pages();
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        
        if (memoryUsage > RESOURCE_MONITORING.memoryThresholdMB) {
            log(`High memory usage detected: ${memoryUsage.toFixed(2)} MB`, logFilePath, { logLevel: 'WARN' });
            await closeExcessTabs(browser, logFilePath);
        }
    } catch (error) {
        log(`Error monitoring browser resources: ${error.message}`, logFilePath, { logLevel: 'ERROR' });
    }
};
/**
 * Start periodic resource monitoring
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 */
const startResourceMonitoring = (browser, logFilePath) => {
    return setInterval(() => {
        monitorBrowserResources(browser, logFilePath);
    }, RESOURCE_MONITORING.cleanupIntervalMS);
};
/**
 * Clean up browser resources
 * @param {Object} browser - Puppeteer browser instance
 * @param {string} logFilePath - Path to the log file
 */
const cleanupBrowserResources = async (browser, logFilePath) => {
    try {
        const pages = await browser.pages();
        for (const page of pages) {
            if (!page.isClosed()) {
                await page.close();
            }
        }
        log('All browser pages closed successfully', logFilePath, { logLevel: 'INFO' });
    } catch (error) {
        log(`Error cleaning up browser resources: ${error.message}`, logFilePath, { logLevel: 'ERROR' });
    }
};
export { 
    getOpenTabCount, 
    waitForAvailableTab, 
    configureBrowserPage,
    closeExcessTabs,
    monitorBrowserResources,
    cleanupBrowserResources,
    startResourceMonitoring
};
// end browserUtils.js