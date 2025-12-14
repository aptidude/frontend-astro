/**
 * IndexNow URL Submission Script
 * 
 * This script reads the sitemap and submits all URLs to IndexNow for faster indexing
 * on Bing, Yandex, and other supported search engines.
 * 
 * Usage: node scripts/submit-indexnow.js
 * 
 * Options:
 *   --dry-run    Preview URLs without submitting
 *   --sitemap    Specify a custom sitemap URL (default: https://aptidude.in/sitemap-index.xml)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    host: 'aptidude.in',
    key: '75ef1c2fc3f74b84ab8e814e76d9d918',
    keyLocation: 'https://aptidude.in/75ef1c2fc3f74b84ab8e814e76d9d918.txt',
    indexNowEndpoint: 'https://api.indexnow.org/IndexNow',
    // You can also use Bing's endpoint directly: 'https://www.bing.com/IndexNow'
    sitemapUrl: 'https://aptidude.in/sitemap-index.xml',
    batchSize: 10000, // IndexNow allows up to 10,000 URLs per request
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const customSitemapIndex = args.findIndex(arg => arg === '--sitemap');
if (customSitemapIndex !== -1 && args[customSitemapIndex + 1]) {
    CONFIG.sitemapUrl = args[customSitemapIndex + 1];
}

/**
 * Fetch XML content from a URL
 */
async function fetchXml(url) {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
}

/**
 * Extract URLs from sitemap XML content
 */
function extractUrlsFromSitemap(xmlContent) {
    const urls = [];
    // Match <loc>...</loc> tags
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xmlContent)) !== null) {
        urls.push(match[1].trim());
    }
    return urls;
}

/**
 * Check if a URL is a sitemap (ends with .xml)
 */
function isSitemapUrl(url) {
    return url.endsWith('.xml');
}

/**
 * Recursively fetch all page URLs from sitemaps
 */
async function getAllUrls(sitemapUrl) {
    const allUrls = [];
    const xmlContent = await fetchXml(sitemapUrl);
    const urls = extractUrlsFromSitemap(xmlContent);

    for (const url of urls) {
        if (isSitemapUrl(url)) {
            // It's a nested sitemap, fetch its URLs recursively
            console.log(`Found nested sitemap: ${url}`);
            const nestedUrls = await getAllUrls(url);
            allUrls.push(...nestedUrls);
        } else {
            // It's a page URL
            allUrls.push(url);
        }
    }

    return allUrls;
}

/**
 * Submit URLs to IndexNow
 */
async function submitToIndexNow(urls) {
    if (urls.length === 0) {
        console.log('No URLs to submit.');
        return;
    }

    // Split into batches if needed
    const batches = [];
    for (let i = 0; i < urls.length; i += CONFIG.batchSize) {
        batches.push(urls.slice(i, i + CONFIG.batchSize));
    }

    console.log(`\nSubmitting ${urls.length} URLs in ${batches.length} batch(es)...`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\nBatch ${i + 1}/${batches.length}: ${batch.length} URLs`);

        const payload = {
            host: CONFIG.host,
            key: CONFIG.key,
            keyLocation: CONFIG.keyLocation,
            urlList: batch,
        };

        if (isDryRun) {
            console.log('DRY RUN - Would submit:', JSON.stringify(payload, null, 2));
            continue;
        }

        try {
            const response = await fetch(CONFIG.indexNowEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: JSON.stringify(payload),
            });

            const statusCode = response.status;
            
            // Handle response codes as per IndexNow documentation
            switch (statusCode) {
                case 200:
                    console.log(`✅ Batch ${i + 1}: Successfully submitted ${batch.length} URLs`);
                    break;
                case 202:
                    console.log(`✅ Batch ${i + 1}: Accepted - URLs received and will be processed`);
                    break;
                case 400:
                    console.error(`❌ Batch ${i + 1}: Bad request - Invalid format`);
                    break;
                case 403:
                    console.error(`❌ Batch ${i + 1}: Forbidden - Key not valid (check if key file is accessible)`);
                    break;
                case 422:
                    console.error(`❌ Batch ${i + 1}: Unprocessable Entity - URLs don't belong to host or key mismatch`);
                    break;
                case 429:
                    console.error(`❌ Batch ${i + 1}: Too Many Requests - Rate limited, try again later`);
                    break;
                default:
                    const responseText = await response.text();
                    console.log(`Batch ${i + 1}: Response ${statusCode} - ${responseText}`);
            }
        } catch (error) {
            console.error(`❌ Batch ${i + 1}: Error submitting - ${error.message}`);
        }

        // Small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

/**
 * Alternative: Submit URLs from local dist folder (after build)
 */
async function getUrlsFromLocalSitemap() {
    const distPath = path.join(__dirname, '../dist');
    const sitemapIndexPath = path.join(distPath, 'sitemap-index.xml');
    
    if (!fs.existsSync(sitemapIndexPath)) {
        // Try single sitemap
        const sitemapPath = path.join(distPath, 'sitemap-0.xml');
        if (fs.existsSync(sitemapPath)) {
            const content = fs.readFileSync(sitemapPath, 'utf-8');
            return extractUrlsFromSitemap(content);
        }
        return null;
    }

    const allUrls = [];
    const indexContent = fs.readFileSync(sitemapIndexPath, 'utf-8');
    const sitemapUrls = extractUrlsFromSitemap(indexContent);

    for (const sitemapUrl of sitemapUrls) {
        // Convert URL to local path
        const filename = sitemapUrl.split('/').pop();
        const localPath = path.join(distPath, filename);
        
        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf-8');
            const urls = extractUrlsFromSitemap(content);
            allUrls.push(...urls.filter(url => !url.endsWith('.xml')));
        }
    }

    return allUrls;
}

/**
 * Main function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('IndexNow URL Submission for aptidude.in');
    console.log('='.repeat(60));
    console.log(`\nKey: ${CONFIG.key}`);
    console.log(`Key Location: ${CONFIG.keyLocation}`);
    console.log(`IndexNow Endpoint: ${CONFIG.indexNowEndpoint}`);
    
    if (isDryRun) {
        console.log('\n⚠️  DRY RUN MODE - No URLs will be submitted\n');
    }

    let urls;

    // First try to get URLs from local dist folder (if available)
    console.log('\nChecking for local sitemap in dist folder...');
    urls = await getUrlsFromLocalSitemap();

    if (urls && urls.length > 0) {
        console.log(`Found ${urls.length} URLs from local dist folder`);
    } else {
        // Fetch from live sitemap
        console.log('No local sitemap found, fetching from live site...');
        try {
            urls = await getAllUrls(CONFIG.sitemapUrl);
            console.log(`Found ${urls.length} URLs from live sitemap`);
        } catch (error) {
            console.error(`Error fetching sitemap: ${error.message}`);
            console.log('\nTrying alternative sitemap URL: https://aptidude.in/sitemap-0.xml');
            try {
                urls = await getAllUrls('https://aptidude.in/sitemap-0.xml');
                console.log(`Found ${urls.length} URLs from alternative sitemap`);
            } catch (error2) {
                console.error(`Error: ${error2.message}`);
                process.exit(1);
            }
        }
    }

    // Display all URLs
    console.log('\n📋 URLs to submit:');
    console.log('-'.repeat(60));
    urls.forEach((url, index) => {
        console.log(`${(index + 1).toString().padStart(4)}. ${url}`);
    });
    console.log('-'.repeat(60));
    console.log(`Total: ${urls.length} URLs\n`);

    // Submit to IndexNow
    await submitToIndexNow(urls);

    console.log('\n' + '='.repeat(60));
    console.log('Done!');
    console.log('\n📌 Next steps:');
    console.log('1. Verify your key file is accessible at:');
    console.log(`   ${CONFIG.keyLocation}`);
    console.log('2. Check Bing Webmaster Tools to verify URLs are received:');
    console.log('   https://www.bing.com/webmasters');
    console.log('='.repeat(60));
}

main().catch(console.error);
