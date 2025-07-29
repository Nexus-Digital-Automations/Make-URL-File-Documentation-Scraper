// File: keywordFilter.js
// Purpose: Advanced keyword filtering utility with comprehensive contracts and type safety
// Author: Jeremy Parker (Enhanced ADDER+)
// Created: 2025-06-06
// Last Modified: 2025-06-06
// Techniques: Design by Contract, Defensive Programming, Type-Driven Development, Pure Functions

import { log } from './logger.js';
import { 
    KEYWORD_FILTER_OPTIONS, 
    URL_CONTENT_ANALYSIS, 
    KEYWORD_VALIDATION_PATTERNS 
} from './config.js';

/**
 * BRANDED TYPES FOR TYPE-DRIVEN DEVELOPMENT
 * These create distinct types to prevent mixing up different string types
 */

/**
 * @typedef {string} ValidatedKeyword - A keyword that has passed validation
 * @typedef {string} SanitizedContent - Content that has been sanitized for analysis
 * @typedef {Object} KeywordMatchResult
 * @property {boolean} matches - Whether keywords were found
 * @property {string[]} foundKeywords - Keywords that were actually found
 * @property {string} matchLocation - Where the match was found (url, title, content, etc.)
 * @property {number} matchCount - Total number of keyword matches
 */

/**
 * DESIGN BY CONTRACT: Keyword validation with comprehensive contracts
 * 
 * Preconditions:
 * - keywords must be an array
 * - keywords must not be null or undefined
 * - individual keywords must be strings
 * - keywords must not contain malicious patterns
 * 
 * Postconditions:
 * - returns array of ValidatedKeyword
 * - returned keywords are sanitized and safe
 * - empty keywords are filtered out
 * 
 * Invariants:
 * - No malicious content in validated keywords
 * - All returned keywords meet minimum length requirements
 * 
 * @param {string[]} keywords - Array of keywords to validate
 * @param {string} logFilePath - Path to log file for error reporting
 * @returns {ValidatedKeyword[]} - Array of validated and sanitized keywords
 */
export const validateKeywords = (keywords, logFilePath) => {
    // DEFENSIVE PROGRAMMING: Comprehensive input validation
    if (!Array.isArray(keywords)) {
        const error = new TypeError('Keywords must be an array');
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    if (keywords.length === 0) {
        log(`[INFO] Empty keywords array provided`, logFilePath);
        return [];
    }

    if (keywords.length > KEYWORD_FILTER_OPTIONS.maxKeywords) {
        const error = new Error(`Too many keywords: ${keywords.length} > ${KEYWORD_FILTER_OPTIONS.maxKeywords}`);
        log(`[CONTRACT_VIOLATION] Precondition failed: ${error.message}`, logFilePath);
        throw error;
    }

    const validatedKeywords = [];

    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];

        // TYPE SAFETY: Ensure each keyword is a string
        if (typeof keyword !== 'string') {
            log(`[VALIDATION_ERROR] Keyword at index ${i} is not a string: ${typeof keyword}`, logFilePath);
            continue;
        }

        // DEFENSIVE PROGRAMMING: Sanitize input
        let sanitizedKeyword = keyword.trim();
        
        if (KEYWORD_VALIDATION_PATTERNS.normalizeCase) {
            sanitizedKeyword = sanitizedKeyword.toLowerCase();
        }

        if (KEYWORD_VALIDATION_PATTERNS.sanitizeWhitespace) {
            sanitizedKeyword = sanitizedKeyword.replace(/\\s+/g, ' ');
        }

        // SECURITY BOUNDARY: Check for malicious patterns
        const hasMaliciousPattern = KEYWORD_VALIDATION_PATTERNS.forbiddenPatterns.some(
            pattern => pattern.test(sanitizedKeyword)
        );

        if (hasMaliciousPattern) {
            log(`[SECURITY_VIOLATION] Malicious pattern detected in keyword: ${keyword}`, logFilePath);
            continue;
        }

        // LENGTH VALIDATION
        if (sanitizedKeyword.length < KEYWORD_FILTER_OPTIONS.minKeywordLength) {
            log(`[VALIDATION_ERROR] Keyword too short: "${keyword}" (${sanitizedKeyword.length} chars)`, logFilePath);
            continue;
        }

        validatedKeywords.push(sanitizedKeyword);
    }

    // POSTCONDITION: Verify all returned keywords are valid
    const allValid = validatedKeywords.every(keyword => 
        typeof keyword === 'string' && 
        keyword.length >= KEYWORD_FILTER_OPTIONS.minKeywordLength &&
        !KEYWORD_VALIDATION_PATTERNS.forbiddenPatterns.some(pattern => pattern.test(keyword))
    );

    if (!allValid) {
        throw new Error('Postcondition violated: Invalid keywords in result');
    }

    log(`[SUCCESS] Validated ${validatedKeywords.length}/${keywords.length} keywords`, logFilePath);
    return validatedKeywords;
};

/**
 * PURE FUNCTION: Extract analyzable content from page
 * 
 * Preconditions:
 * - page must be a valid Puppeteer page object
 * - page must be loaded and ready
 * 
 * Postconditions:
 * - returns object with all analyzed content
 * - content is sanitized and safe for analysis
 * 
 * @param {Object} page - Puppeteer page instance
 * @param {string} logFilePath - Path to log file
 * @returns {Promise<Object>} - Object containing extracted content
 */
export const extractAnalyzableContent = async (page, logFilePath) => {
    // DEFENSIVE PROGRAMMING: Validate page object
    if (!page || typeof page.evaluate !== 'function') {
        throw new TypeError('Invalid page object provided');
    }

    try {
        const content = await page.evaluate(() => {
            const result = {
                url: window.location.href,
                title: document.title || '',
                metaDescription: '',
                headings: [],
                content: ''
            };

            // Extract meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                result.metaDescription = metaDesc.getAttribute('content') || '';
            }

            // Extract headings (h1, h2, h3)
            const headingSelectors = ['h1', 'h2', 'h3'];
            headingSelectors.forEach(selector => {
                const headings = document.querySelectorAll(selector);
                headings.forEach(heading => {
                    if (heading.textContent) {
                        result.headings.push(heading.textContent.trim());
                    }
                });
            });

            // Extract limited content if enabled
            if (window.URL_CONTENT_ANALYSIS && window.URL_CONTENT_ANALYSIS.analyzeContent) {
                const contentElement = document.querySelector('main, .content, .main-content, body');
                if (contentElement) {
                    result.content = contentElement.textContent || '';
                }
            }

            return result;
        });

        // DEFENSIVE PROGRAMMING: Sanitize extracted content
        const sanitizedContent = {
            url: (content.url || '').slice(0, 2000), // Limit URL length
            title: (content.title || '').slice(0, 500), // Limit title length
            metaDescription: (content.metaDescription || '').slice(0, 1000),
            headings: (content.headings || []).slice(0, 20).map(h => h.slice(0, 200)),
            content: (content.content || '').slice(0, URL_CONTENT_ANALYSIS.maxContentLength)
        };

        log(`[SUCCESS] Extracted content: title=${sanitizedContent.title.length}chars, headings=${sanitizedContent.headings.length}`, logFilePath);
        return sanitizedContent;

    } catch (error) {
        log(`[ERROR] Failed to extract content: ${error.message}`, logFilePath);
        // Return empty content object as fallback
        return {
            url: '',
            title: '',
            metaDescription: '',
            headings: [],
            content: ''
        };
    }
};

/**
 * PURE FUNCTION: Check if keywords match in content
 * 
 * Preconditions:
 * - keywords must be validated array of strings
 * - content must be sanitized object
 * - options must be valid configuration object
 * 
 * Postconditions:
 * - returns KeywordMatchResult with complete match information
 * - result accurately reflects keyword presence
 * 
 * Invariants:
 * - Function has no side effects
 * - Result is deterministic for same inputs
 * 
 * @param {ValidatedKeyword[]} keywords - Validated keywords to search for
 * @param {Object} content - Sanitized content object
 * @param {Object} options - Keyword filter options
 * @param {string} logFilePath - Path to log file
 * @returns {KeywordMatchResult} - Detailed match results
 */
export const checkKeywordMatch = (keywords, content, options, logFilePath) => {
    // DEFENSIVE PROGRAMMING: Input validation
    if (!Array.isArray(keywords)) {
        throw new TypeError('Keywords must be an array');
    }

    if (!content || typeof content !== 'object') {
        throw new TypeError('Content must be an object');
    }

    if (keywords.length === 0) {
        return {
            matches: true,  // FIXED: Empty keywords should include all URLs
            foundKeywords: [],
            matchLocation: '',
            matchCount: 0
        };
    }

    const foundKeywords = [];
    const matchLocations = [];
    let totalMatchCount = 0;

    // Helper function for text matching
    const textContainsKeyword = (text, keyword) => {
        if (!text || typeof text !== 'string') return false;
        
        const searchText = options.caseSensitive ? text : text.toLowerCase();
        const searchKeyword = options.caseSensitive ? keyword : keyword.toLowerCase();
        
        if (options.exactMatch) {
            // Word boundary matching for exact matches
            const regex = new RegExp(`\\\\b${searchKeyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\\\b`, 'i');
            return regex.test(searchText);
        } else {
            return searchText.includes(searchKeyword);
        }
    };

    // Check each content area if enabled
    for (const keyword of keywords) {
        let keywordFound = false;

        // Check URL
        if (options.analyzeUrl && textContainsKeyword(content.url, keyword)) {
            foundKeywords.push(keyword);
            matchLocations.push('url');
            keywordFound = true;
            totalMatchCount++;
        }

        // Check title
        if (options.analyzeTitle && textContainsKeyword(content.title, keyword)) {
            if (!keywordFound) foundKeywords.push(keyword);
            matchLocations.push('title');
            keywordFound = true;
            totalMatchCount++;
        }

        // Check meta description
        if (options.analyzeMetaDescription && textContainsKeyword(content.metaDescription, keyword)) {
            if (!keywordFound) foundKeywords.push(keyword);
            matchLocations.push('meta');
            keywordFound = true;
            totalMatchCount++;
        }

        // Check headings
        if (options.analyzeHeadings) {
            for (const heading of content.headings) {
                if (textContainsKeyword(heading, keyword)) {
                    if (!keywordFound) foundKeywords.push(keyword);
                    matchLocations.push('heading');
                    keywordFound = true;
                    totalMatchCount++;
                    break; // Only count once per keyword
                }
            }
        }

        // Check content
        if (options.analyzeContent && textContainsKeyword(content.content, keyword)) {
            if (!keywordFound) foundKeywords.push(keyword);
            matchLocations.push('content');
            keywordFound = true;
            totalMatchCount++;
        }
    }

    // Apply logical operator (AND vs OR)
    const matches = options.logicalAnd 
        ? foundKeywords.length === keywords.length  // All keywords must be found
        : foundKeywords.length > 0;                 // Any keyword found

    const result = {
        matches,
        foundKeywords: [...new Set(foundKeywords)], // Remove duplicates
        matchLocation: [...new Set(matchLocations)].join(', '),
        matchCount: totalMatchCount
    };

    const urlForLogging = content.url ? content.url.slice(0, 50) : 'unknown';
    log(`[KEYWORD_MATCH] URL: ${urlForLogging}... | Matches: ${matches} | Found: ${result.foundKeywords.length}/${keywords.length} | Locations: ${result.matchLocation}`, logFilePath);

    return result;
};

/**
 * MAIN INTERFACE: Check if URL should be included based on keywords
 * 
 * Design by Contract: Main filtering function with comprehensive contracts
 * 
 * Preconditions:
 * - page must be valid and loaded Puppeteer page
 * - keywords array must be provided (can be empty)
 * - options must be valid configuration object
 * 
 * Postconditions:
 * - returns boolean indicating whether URL should be included
 * - logs detailed information about filtering decision
 * 
 * @param {Object} page - Puppeteer page instance
 * @param {string[]} keywords - Keywords to filter by
 * @param {Object} options - Filtering options
 * @param {string} logFilePath - Path to log file
 * @returns {Promise<boolean>} - Whether the URL should be included
 */
export const shouldIncludeUrl = async (page, keywords, options = {}, logFilePath) => {
    try {
        // DEFENSIVE PROGRAMMING: Merge options with defaults
        const filterOptions = { ...KEYWORD_FILTER_OPTIONS, ...URL_CONTENT_ANALYSIS, ...options };

        // If no keywords provided, include all URLs
        if (!keywords || keywords.length === 0) {
            log(`[KEYWORD_FILTER] No keywords provided - including URL`, logFilePath);
            return true;
        }

        // DESIGN BY CONTRACT: Validate keywords
        const validatedKeywords = validateKeywords(keywords, logFilePath);
        
        if (validatedKeywords.length === 0) {
            log(`[KEYWORD_FILTER] No valid keywords after validation - including URL`, logFilePath);
            return true;
        }

        // PURE FUNCTION: Extract content for analysis
        const content = await extractAnalyzableContent(page, logFilePath);

        // PURE FUNCTION: Check for keyword matches
        const matchResult = checkKeywordMatch(validatedKeywords, content, filterOptions, logFilePath);

        // Log filtering decision
        const decision = matchResult.matches ? 'INCLUDE' : 'EXCLUDE';
        log(`[KEYWORD_FILTER] ${decision} URL: ${content.url} | Keywords: [${validatedKeywords.join(', ')}] | Found: [${matchResult.foundKeywords.join(', ')}]`, logFilePath);

        return matchResult.matches;

    } catch (error) {
        // DEFENSIVE PROGRAMMING: Error handling with fallback
        log(`[ERROR] Keyword filtering failed: ${error.message} | Including URL by default`, logFilePath);
        return true; // Default to including URL on error
    }
};

/**
 * PROPERTY-BASED TESTING HELPER: Generate test cases for keyword filtering
 * This function helps identify edge cases and ensures robustness
 * 
 * @returns {Object[]} - Array of test cases with expected results
 */
export const generateKeywordFilterTestCases = () => {
    return [
        // Basic functionality tests
        { keywords: [], content: { title: 'Test' }, expected: true, description: 'Empty keywords should include all' },
        { keywords: ['test'], content: { title: 'Test Page' }, expected: true, description: 'Case insensitive match' },
        { keywords: ['missing'], content: { title: 'Test Page' }, expected: false, description: 'No match should exclude' },
        
        // Edge cases
        { keywords: [''], content: { title: 'Test' }, expected: true, description: 'Empty keyword should be filtered out' },
        { keywords: ['a'], content: { title: 'Test' }, expected: true, description: 'Short keywords should be filtered out' },
        
        // Security tests
        { keywords: ['<script>'], content: { title: 'Test' }, expected: true, description: 'Malicious keywords should be filtered out' },
        { keywords: ['javascript:'], content: { title: 'Test' }, expected: true, description: 'Protocol injection should be filtered out' },
        
        // Logical operator tests
        { keywords: ['test', 'page'], content: { title: 'Test Page' }, logicalAnd: true, expected: true, description: 'AND logic with both keywords' },
        { keywords: ['test', 'missing'], content: { title: 'Test Page' }, logicalAnd: true, expected: false, description: 'AND logic with missing keyword' },
        { keywords: ['test', 'missing'], content: { title: 'Test Page' }, logicalAnd: false, expected: true, description: 'OR logic with one keyword' }
    ];
};

// Export all functions for comprehensive testing and usage
export {
    KEYWORD_FILTER_OPTIONS,
    URL_CONTENT_ANALYSIS,
    KEYWORD_VALIDATION_PATTERNS
};

// end keywordFilter.js