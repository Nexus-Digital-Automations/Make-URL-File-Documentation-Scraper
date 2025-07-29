// File: smartUrlFilter.js
// Purpose: Intelligent URL filtering to avoid non-valuable pages
// Author: Jeremy Parker (Enhanced ADDER+)
// Created: 2025-06-06
// Techniques: Design by Contract, Defensive Programming, Pattern Recognition

import { log } from './logger.js';

/**
 * DESIGN BY CONTRACT: Smart URL filtering with comprehensive validation
 * 
 * Preconditions:
 * - url must be a valid string
 * - baseUrl must be a valid URL string
 * - options must be a valid configuration object
 * 
 * Postconditions:
 * - returns boolean indicating whether URL should be visited
 * - logs detailed reason for inclusion/exclusion
 * 
 * @param {string} url - URL to evaluate
 * @param {string} baseUrl - Base URL for the crawl
 * @param {Object} options - Filtering options
 * @param {string} logFilePath - Log file path
 * @returns {boolean} - Whether URL should be visited
 */
export const shouldVisitUrl = (url, baseUrl, options = {}, logFilePath) => {
    // DEFENSIVE PROGRAMMING: Input validation
    if (typeof url !== 'string' || url.trim() === '') {
        log(`[SMART_FILTER] Invalid URL provided: ${url}`, logFilePath);
        return false;
    }

    if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        log(`[SMART_FILTER] Invalid base URL provided: ${baseUrl}`, logFilePath);
        return false;
    }

    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // RULE 1: Skip different domains (unless explicitly allowed)
        if (urlObj.hostname !== baseUrlObj.hostname) {
            log(`[SMART_FILTER] SKIP - Different domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`, logFilePath);
            return false;
        }

        // RULE 2: Skip language variants (localization parameters)
        const languageParams = ['hl', 'lang', 'locale', 'l'];
        const hasLanguageParam = languageParams.some(param => urlObj.searchParams.has(param));
        if (hasLanguageParam) {
            const langValue = languageParams.find(param => urlObj.searchParams.get(param));
            const langParam = urlObj.searchParams.get(langValue) || 'unknown';
            log(`[SMART_FILTER] SKIP - Language variant detected: ${langParam}`, logFilePath);
            return false;
        }

        // RULE 3: Skip authentication and account-related URLs (but allow auth documentation)
        const authPatterns = [
            /\/signin/i,
            /\/login/i,
            /\/register/i,
            /\/signup/i,
            /\/logout/i,
            /\/account/i,
            /\/profile/i,
            /\/dashboard/i,
            /\/admin/i,
            /\/_d\/signin/i,
            /\/oauth$/i,  // OAuth endpoints but not documentation
            /\/sso/i
        ];
        
        // Check for auth patterns but exclude documentation about auth
        const isAuthUrl = authPatterns.some(pattern => pattern.test(url));
        const isAuthDocumentation = /\/(docs?|guides?|tutorials?|examples?).*auth/i.test(url) || 
                                   /\/auth.*(docs?|guides?|tutorials?|examples?)/i.test(url) ||
                                   /\/guides?\/auth\//i.test(url); // Specific guide about auth
        
        if (isAuthUrl && !isAuthDocumentation) {
            log(`[SMART_FILTER] SKIP - Authentication/Account URL detected`, logFilePath);
            return false;
        }

        // RULE 4: Skip technical/system files
        const technicalPatterns = [
            /\.css$/i,
            /\.js$/i,
            /\.json$/i,
            /\.xml$/i,
            /\.txt$/i,
            /\.pdf$/i,
            /\.zip$/i,
            /\.gz$/i,
            /\.tar$/i,
            /\.png$/i,
            /\.jpg$/i,
            /\.jpeg$/i,
            /\.gif$/i,
            /\.svg$/i,
            /\.ico$/i,
            /\/manifest\.json/i,
            /\/opensearch\.xml/i,
            /\/robots\.txt/i,
            /\/sitemap/i,
            /\/favicon/i,
            /\/_pwa\//i,
            /\/sw\.js/i,
            /\/service-worker/i
        ];

        if (technicalPatterns.some(pattern => pattern.test(url))) {
            log(`[SMART_FILTER] SKIP - Technical/System file detected`, logFilePath);
            return false;
        }

        // RULE 5: Skip non-content pages
        const nonContentPatterns = [
            /\/newsletter/i,
            /\/subscribe/i,
            /\/unsubscribe/i,
            /\/contact/i,
            /\/about/i,
            /\/privacy/i,
            /\/terms/i,
            /\/legal/i,
            /\/cookies/i,
            /\/support$/i,  // Basic support pages (but allow support docs)
            /\/help$/i,     // Basic help pages (but allow help docs)
            /\/faq$/i,      // Basic FAQ pages (but allow FAQ docs)
            /\/search$/i,
            /\/404/i,
            /\/error/i,
            /\/maintenance/i,
            /\/coming-?soon/i,
            /\/under-?construction/i,
            /\/placeholder/i,
            /\/demo$/i,     // Demo pages without content
            /\/example$/i,  // Example pages without content
            /\/test$/i,     // Test pages
            /\/playground$/i, // Basic playground without docs
            /\/branding/i,
            /\/press/i,
            /\/media/i,
            /\/careers/i,
            /\/jobs/i,
            /\/investor/i,
            /\/blog$/i,     // Blog index (but allow blog posts)
            /\/news$/i      // News index (but allow news articles)
        ];

        if (nonContentPatterns.some(pattern => pattern.test(url))) {
            log(`[SMART_FILTER] SKIP - Non-content page detected`, logFilePath);
            return false;
        }

        // RULE 6: Skip URLs with excessive parameters (likely tracking/session URLs)
        const paramCount = urlObj.searchParams.size;
        if (paramCount > 5) {
            log(`[SMART_FILTER] SKIP - Too many parameters (${paramCount}), likely tracking URL`, logFilePath);
            return false;
        }

        // RULE 7: Skip tracking and analytics URLs
        const trackingPatterns = [
            /\/analytics/i,
            /\/tracking/i,
            /\/metrics/i,
            /\/telemetry/i,
            /\/events/i,
            /\/pixel/i,
            /\/beacon/i,
            /\/gtm/i,
            /\/ga\//i,
            /\/facebook/i,
            /\/twitter/i,
            /\/linkedin/i,
            /\/social/i,
            /\/share/i,
            /\/embed/i
        ];

        if (trackingPatterns.some(pattern => pattern.test(url))) {
            log(`[SMART_FILTER] SKIP - Tracking/Analytics URL detected`, logFilePath);
            return false;
        }

        // RULE 8: Skip URLs with common tracking parameters
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'igshid',
            'ref', 'referrer', 'source', 'campaign',
            'tracking', 'track', 'campaign_id',
            'affiliate', 'partner', 'promo',
            'session', 'sid', 'token', 'key',
            'timestamp', 'cache', 'version', 'v',
            'continue', 'redirect', 'return', 'next',
            'prompt', 'force', 'reload'
        ];

        const hasTrackingParams = trackingParams.some(param => urlObj.searchParams.has(param));
        if (hasTrackingParams) {
            log(`[SMART_FILTER] SKIP - Tracking parameters detected`, logFilePath);
            return false;
        }

        // RULE 9: Skip obviously non-documentation URLs
        const nonDocPatterns = [
            /\/extras\.css/i,
            /\/globals\.css/i,
            /\/styles?\//i,
            /\/assets?\//i,
            /\/images?\//i,
            /\/img\//i,
            /\/static\//i,
            /\/public\//i,
            /\/uploads?\//i,
            /\/downloads?\//i,
            /\/files?\//i,
            /\/media\//i,
            /\/resources?\//i,
            /\/fonts?\//i,
            /\/icons?\//i,
            /\/themes?\//i,
            /\/templates?\//i,
            /\/widgets?\//i,
            /\/plugins?\//i,
            /\/modules?\//i,
            /\/components?\//i,
            /\/partials?\//i,
            /\/includes?\//i,
            /\/vendor\//i,
            /\/node_modules\//i,
            /\/bower_components\//i,
            /\/packages?\//i,
            /\/lib\//i,
            /\/libs?\//i,
            /\/dependencies\//i,
            /\/third[_-]party\//i,
            /\/external\//i
        ];

        if (nonDocPatterns.some(pattern => pattern.test(url))) {
            log(`[SMART_FILTER] SKIP - Non-documentation resource detected`, logFilePath);
            return false;
        }

        // RULE 10: Skip duplicate content with different sorting/display parameters
        const viewParams = [
            'sort', 'order', 'view', 'display', 'layout',
            'page', 'per_page', 'limit', 'offset',
            'filter', 'category', 'tag', 'type',
            'format', 'theme', 'skin', 'mode'
        ];

        const hasViewParams = viewParams.some(param => urlObj.searchParams.has(param));
        if (hasViewParams) {
            log(`[SMART_FILTER] SKIP - Display/View parameter detected (likely duplicate content)`, logFilePath);
            return false;
        }

        // RULE 11: Apply keyword filtering if keywords are provided
        if (options.keywords && Array.isArray(options.keywords) && options.keywords.length > 0) {
            const urlLower = url.toLowerCase();
            const hasKeywordInUrl = options.keywords.some(keyword => 
                urlLower.includes(keyword.toLowerCase())
            );

            if (!hasKeywordInUrl) {
                log(`[SMART_FILTER] SKIP - No keywords found in URL: ${options.keywords.join(', ')}`, logFilePath);
                return false;
            }
        }

        // RULE 12: Prioritize documentation-like URLs (including auth documentation)
        const docPatterns = [
            /\/docs?\//i,
            /\/documentation/i,
            /\/guides?\//i,
            /\/tutorials?\//i,
            /\/examples?\//i,
            /\/samples?\//i,
            /\/reference/i,
            /\/api\//i,
            /\/sdk\//i,
            /\/dev\//i,
            /\/developer/i,
            /\/manual/i,
            /\/handbook/i,
            /\/wiki/i,
            /\/knowledge/i,
            /\/learn/i,
            /\/training/i,
            /\/course/i,
            /\/tutorial/i,
            /\/howto/i,
            /\/how[_-]to/i,
            /\/getting[_-]?started/i,
            /\/quickstart/i,
            /\/quick[_-]start/i,
            /\/setup/i,
            /\/installation/i,
            /\/config/i,
            /\/implementation/i,
            /\/integration/i,
            /\/usage/i,
            /\/best[_-]practices/i,
            /\/guidelines/i,
            /\/standards/i,
            /\/conventions/i,
            /\/specification/i,
            /\/spec/i,
            /\/readme/i,
            /\/changelog/i,
            /\/release[_-]?notes/i,
            /\/migration/i,
            /\/upgrade/i,
            /\/troubleshoot/i,
            /\/faq/i,
            /\/help\//i,    // Help with subdirectories
            /\/support\//i, // Support with subdirectories
            /\/guides?\/auth\//i     // Guides about authentication
        ];

        const isDocumentationUrl = docPatterns.some(pattern => pattern.test(url));
        if (isDocumentationUrl) {
            log(`[SMART_FILTER] INCLUDE - Documentation URL detected`, logFilePath);
            return true;
        }

        // RULE 13: Include URLs that seem content-rich
        const contentPatterns = [
            /\/articles?\//i,
            /\/posts?\//i,
            /\/blog\//i,
            /\/news\//i,
            /\/announcements?\//i,
            /\/updates?\//i,
            /\/releases?\//i,
            /\/features?\//i,
            /\/products?\//i,
            /\/services?\//i,
            /\/solutions?\//i,
            /\/case[_-]?studies?\//i,
            /\/stories?\//i,
            /\/insights?\//i,
            /\/research\//i,
            /\/papers?\//i,
            /\/reports?\//i,
            /\/whitepapers?\//i,
            /\/ebooks?\//i,
            /\/presentations?\//i,
            /\/webinars?\//i,
            /\/videos?\//i,
            /\/podcasts?\//i,
            /\/recordings?\//i,
            /\/demos?\//i,
            /\/samples?\//i
        ];

        const isContentUrl = contentPatterns.some(pattern => pattern.test(url));
        if (isContentUrl) {
            log(`[SMART_FILTER] INCLUDE - Content URL detected`, logFilePath);
            return true;
        }

        // RULE 14: Default inclusion for short, simple paths
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        if (pathParts.length <= 3 && !urlObj.search) {
            log(`[SMART_FILTER] INCLUDE - Simple path structure`, logFilePath);
            return true;
        }

        // RULE 15: Include if path suggests it's a main content page
        const mainContentIndicators = [
            /^\/[a-z0-9-]+$/i,  // Single path segment
            /^\/[a-z0-9-]+\/[a-z0-9-]+$/i,  // Two path segments
            /\/index$/i,
            /\/home$/i,
            /\/main$/i,
            /\/overview$/i,
            /\/introduction$/i,
            /\/intro$/i,
            /\/summary$/i,
            /\/details$/i,
            /\/info$/i,
            /\/about\//i   // About with subdirectories
        ];

        const isMainContent = mainContentIndicators.some(pattern => pattern.test(urlObj.pathname));
        if (isMainContent) {
            log(`[SMART_FILTER] INCLUDE - Main content indicator detected`, logFilePath);
            return true;
        }

        // RULE 16: Final check - if URL has made it this far and has reasonable length
        if (url.length < 200 && pathParts.length <= 5) {
            log(`[SMART_FILTER] INCLUDE - Reasonable URL structure`, logFilePath);
            return true;
        }

        // RULE 17: Default rejection for URLs that don't match any inclusion criteria
        log(`[SMART_FILTER] SKIP - No inclusion criteria met`, logFilePath);
        return false;

    } catch (error) {
        log(`[SMART_FILTER] ERROR - Failed to parse URL: ${error.message}`, logFilePath);
        return false;
    }
};

/**
 * PURE FUNCTION: Normalize URL for comparison to avoid duplicates
 * 
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
export const normalizeUrlForComparison = (url) => {
    try {
        const urlObj = new URL(url);
        
        // Remove common tracking parameters
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'ref', 'source', 'hl', 'lang'
        ];
        
        trackingParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        
        // Remove trailing slash from pathname
        if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        
        // Sort remaining parameters for consistent comparison
        urlObj.searchParams.sort();
        
        return urlObj.toString().toLowerCase();
    } catch {
        return url.toLowerCase();
    }
};

/**
 * IMMUTABLE PATTERN: Create filtering statistics
 * 
 * @param {Set} visitedUrls - Set of visited URLs
 * @param {Set} skippedUrls - Set of skipped URLs  
 * @param {Object} reasons - Object tracking skip reasons
 * @returns {Object} - Immutable statistics object
 */
export const createFilteringStats = (visitedUrls, skippedUrls, reasons) => {
    const total = visitedUrls.size + skippedUrls.size;
    const visitedPercentage = total > 0 ? ((visitedUrls.size / total) * 100).toFixed(1) : 0;
    const skippedPercentage = total > 0 ? ((skippedUrls.size / total) * 100).toFixed(1) : 0;
    
    return Object.freeze({
        total,
        visited: visitedUrls.size,
        skipped: skippedUrls.size,
        visitedPercentage,
        skippedPercentage,
        reasons: Object.freeze({ ...reasons }),
        efficiency: visitedPercentage,
        timestamp: new Date().toISOString()
    });
};

/**
 * Export functions for testing and usage
 */
export default {
    shouldVisitUrl,
    normalizeUrlForComparison,
    createFilteringStats
};

// PROPERTY-BASED TESTING HELPERS
export const generateSmartFilterTestCases = () => {
    return [
        // Language variants
        { url: 'https://example.com/docs?hl=de', expected: false, reason: 'Language parameter' },
        { url: 'https://example.com/docs?lang=fr', expected: false, reason: 'Language parameter' },
        
        // Authentication URLs
        { url: 'https://example.com/signin', expected: false, reason: 'Auth URL' },
        { url: 'https://example.com/_d/signin', expected: false, reason: 'Auth URL' },
        
        // Technical files
        { url: 'https://example.com/style.css', expected: false, reason: 'CSS file' },
        { url: 'https://example.com/manifest.json', expected: false, reason: 'Manifest file' },
        
        // Documentation URLs
        { url: 'https://example.com/docs/api', expected: true, reason: 'Documentation URL' },
        { url: 'https://example.com/guides/setup', expected: true, reason: 'Guide URL' },
        
        // Simple content URLs  
        { url: 'https://example.com/features', expected: true, reason: 'Simple content' },
        { url: 'https://example.com/api/reference', expected: true, reason: 'API reference' }
    ];
};

// end smartUrlFilter.js
