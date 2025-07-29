#!/bin/bash

# Test script to verify keyword filtering recursive behavior
# This will test against a real documentation site

echo "🧪 Testing Recursive Keyword Filtering..."
echo "========================================"

# Test 1: API-focused crawling
echo ""
echo "📋 Test 1: API Documentation Filtering"
echo "URL: https://httpbin.org (simple test site)"
echo "Keywords: api, json, http"
echo ""

cd "/Users/jeremyparker/Desktop/Claude Coding Projects/Documentation_Scraper/Make URL File"

# Run with keywords
node main.js https://httpbin.org api json http

echo ""
echo "✅ Test 1 Complete - Check output folder for results"
echo ""
echo "Expected behavior:"
echo "- Should save pages containing 'api', 'json', or 'http' in title/headings"
echo "- Should recursively explore links from matching pages only"
echo "- Should NOT save or recurse into non-matching pages"

echo ""
echo "🔍 Check the generated unique_urls.txt file to verify only relevant URLs were saved"