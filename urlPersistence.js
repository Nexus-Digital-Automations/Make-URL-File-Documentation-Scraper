/**
 * URL Persistence Module
 * Handles saving and loading processed URLs by hostname for continuation support
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class URLPersistence {
    constructor() {
        this.persistenceDir = path.join(__dirname, 'persistence');
        this.ensurePersistenceDir();
    }

    /**
     * Ensure the persistence directory exists
     */
    async ensurePersistenceDir() {
        try {
            await fs.access(this.persistenceDir);
        } catch {
            await fs.mkdir(this.persistenceDir, { recursive: true });
        }
    }

    /**
     * Get the file path for a hostname's persistence data
     * @param {string} hostname - The hostname to get the file path for
     * @returns {string} File path for hostname data
     */
    getHostnameFilePath(hostname) {
        // Sanitize hostname for use as filename
        const sanitizedHostname = hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        return path.join(this.persistenceDir, `${sanitizedHostname}.json`);
    }

    /**
     * Load processed URLs for a hostname
     * @param {string} hostname - The hostname to load data for
     * @returns {Object} Object containing processed URLs data
     */
    async loadProcessedUrls(hostname) {
        const filePath = this.getHostnameFilePath(hostname);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert arrays back to Sets for efficient lookup
            return {
                processedUrls: new Set(parsed.processedUrls || []),
                visitedUrls: new Set(parsed.visitedUrls || []),
                lastUpdated: parsed.lastUpdated || new Date().toISOString(),
                totalProcessed: parsed.totalProcessed || 0
            };
        } catch {
            // File doesn't exist or is corrupted, return empty sets
            return {
                processedUrls: new Set(),
                visitedUrls: new Set(),
                lastUpdated: new Date().toISOString(),
                totalProcessed: 0
            };
        }
    }

    /**
     * Save processed URLs for a hostname
     * @param {string} hostname - The hostname to save data for
     * @param {Set} processedUrls - Set of processed URLs
     * @param {Set} visitedUrls - Set of visited URLs
     * @param {number} totalProcessed - Total number of URLs processed
     */
    async saveProcessedUrls(hostname, processedUrls, visitedUrls, totalProcessed = 0) {
        await this.ensurePersistenceDir();
        const filePath = this.getHostnameFilePath(hostname);
        
        const data = {
            processedUrls: Array.from(processedUrls),
            visitedUrls: Array.from(visitedUrls),
            lastUpdated: new Date().toISOString(),
            totalProcessed: totalProcessed || processedUrls.size
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * Check if a hostname has existing processed data
     * @param {string} hostname - The hostname to check
     * @returns {boolean} True if hostname has existing data
     */
    async hasExistingData(hostname) {
        const filePath = this.getHostnameFilePath(hostname);
        
        try {
            await fs.access(filePath);
            const data = await this.loadProcessedUrls(hostname);
            return data.processedUrls.size > 0 || data.visitedUrls.size > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get statistics for a hostname's processed data
     * @param {string} hostname - The hostname to get stats for
     * @returns {Object} Statistics object
     */
    async getHostnameStats(hostname) {
        const data = await this.loadProcessedUrls(hostname);
        
        return {
            hostname,
            processedCount: data.processedUrls.size,
            visitedCount: data.visitedUrls.size,
            lastUpdated: data.lastUpdated,
            totalProcessed: data.totalProcessed
        };
    }

    /**
     * Clear all processed data for a hostname (fresh start)
     * @param {string} hostname - The hostname to clear data for
     */
    async clearHostnameData(hostname) {
        const filePath = this.getHostnameFilePath(hostname);
        
        try {
            await fs.unlink(filePath);
            return true;
        } catch {
            // File might not exist, which is fine
            return false;
        }
    }

    /**
     * List all hostnames with saved data
     * @returns {Array} Array of hostname statistics
     */
    async listAllHostnames() {
        await this.ensurePersistenceDir();
        
        try {
            const files = await fs.readdir(this.persistenceDir);
            const hostnames = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', '').replace(/_/g, '.'));

            const stats = await Promise.all(
                hostnames.map(hostname => this.getHostnameStats(hostname))
            );

            return stats;
        } catch {
            return [];
        }
    }

    /**
     * Update processed URLs incrementally (for periodic saves during crawling)
     * @param {string} hostname - The hostname to update
     * @param {Array} newUrls - New URLs to add to processed set
     * @param {Array} newVisitedUrls - New URLs to add to visited set
     */
    async updateProcessedUrls(hostname, newUrls = [], newVisitedUrls = []) {
        const existingData = await this.loadProcessedUrls(hostname);
        
        // Add new URLs to existing sets
        newUrls.forEach(url => existingData.processedUrls.add(url));
        newVisitedUrls.forEach(url => existingData.visitedUrls.add(url));
        
        await this.saveProcessedUrls(
            hostname, 
            existingData.processedUrls, 
            existingData.visitedUrls,
            existingData.processedUrls.size
        );
    }
}

export default URLPersistence;