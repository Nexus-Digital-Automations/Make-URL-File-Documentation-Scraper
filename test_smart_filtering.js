#!/usr/bin/env node

// File: test_smart_filtering.js
// Purpose: Test the smart URL filtering improvements
// Author: Jeremy Parker (Enhanced ADDER+)
// Usage: node test_smart_filtering.js

import { shouldVisitUrl } from './smartUrlFilter.js';

// Test cases based on the problematic URLs from the user's log
const testCases = [
    // URLs that should be FILTERED OUT (false)
    {
        url: 'https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps?hl=de',
        expected: false,
        reason: 'Language variant'
    },
    {
        url: 'https://developers.google.com/_pwa/developers/manifest.json',
        expected: false,
        reason: 'Manifest file'
    },
    {
        url: 'https://developers.google.com/s/opensearch.xml',
        expected: false,
        reason: 'XML file'
    },
    {
        url: 'https://developers.google.com/extras.css',
        expected: false,
        reason: 'CSS file'
    },
    {
        url: 'https://developers.google.com/_d/signin?continue=https%3A%2F%2Fdevelopers.google.com%2Fyoutube%2Fv3%2Fguides%2Fauth%2Fserver-side-web-apps&prompt=select_account',
        expected: false,
        reason: 'Authentication URL'
    },
    
    // URLs that should be INCLUDED (true)
    {
        url: 'https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps',
        expected: true,
        reason: 'Documentation URL'
    },
    {
        url: 'https://developers.google.com/youtube/v3/getting-started',
        expected: true,
        reason: 'Getting started guide'
    },
    {
        url: 'https://developers.google.com/youtube/v3/docs',
        expected: true,
        reason: 'Documentation'
    },
    {
        url: 'https://developers.google.com/youtube/v3/quickstart/python',
        expected: true,
        reason: 'Quickstart guide'
    }
];

// Keywords used in the original command
const keywords = ['youtube/v3'];
const baseUrl = 'https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps';

console.log('🧪 Testing Smart URL Filtering Improvements');
console.log('='.repeat(50));
console.log(`Base URL: ${baseUrl}`);
console.log(`Keywords: [${keywords.join(', ')}]`);
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const options = { keywords };
    const result = shouldVisitUrl(testCase.url, baseUrl, options, './test_smart_filtering.log');
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    
    console.log(`\nTest ${index + 1}: ${status}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Expected: ${testCase.expected ? 'INCLUDE' : 'FILTER OUT'} (${testCase.reason})`);
    console.log(`Actual: ${result ? 'INCLUDE' : 'FILTER OUT'}`);
    
    if (result === testCase.expected) {
        passed++;
    } else {
        failed++;
        console.log(`❌ MISMATCH: Expected ${testCase.expected}, got ${result}`);
    }
});

console.log('\n' + '='.repeat(50));
console.log('🎯 Test Results Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
    console.log('\n🎉 All tests passed! Smart filtering is working correctly.');
    console.log('✨ Your scraper will now avoid problematic URLs and focus on documentation content.');
} else {
    console.log('\n⚠️  Some tests failed. Check the smart filter configuration.');
    console.log('📝 Review test_smart_filtering.log for detailed filter reasoning.');
}

console.log('\n📋 Next Steps:');
console.log('1. Run your scraper with the same command as before');
console.log('2. Watch for [SMART_FILTER] messages in the log');
console.log('3. Notice fewer "Failed to load page" errors');
console.log('4. Expect higher quality URLs in the output');

console.log('\n💡 Example command:');
console.log('node main.js "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps" "youtube/v3"');
