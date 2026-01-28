const logging = require('@tryghost/logging');
const cheerio = require('cheerio');

/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

// Matches Amazon product URLs from various Amazon domains
const AMAZON_PRODUCT_PATH_REGEX = /\/(dp|gp\/product|exec\/obidos\/ASIN|o\/ASIN|gp\/aw\/d)\/([A-Z0-9]{10})/i;
// Matches Amazon short URLs (amzn.to)
const AMAZON_SHORT_URL_REGEX = /^\/([A-Z0-9]{10})/i;

/**
 * @implements ICustomProvider
 */
class AmazonOEmbedProvider {
    /**
     * @param {object} dependencies
     */
    constructor(dependencies) {
        this.dependencies = dependencies;
    }

    /**
     * @param {URL} url
     * @returns {Promise<boolean>}
     */
    async canSupportRequest(url) {
        // Check if it's an Amazon domain
        const amazonDomains = [
            'amazon.com',
            'amazon.co.uk',
            'amazon.ca',
            'amazon.de',
            'amazon.fr',
            'amazon.es',
            'amazon.it',
            'amazon.co.jp',
            'amazon.com.br',
            'amazon.com.mx',
            'amazon.in',
            'amazon.com.au',
            'amzn.to', // Short URL
            'amzn.com'
        ];

        const isAmazonDomain = amazonDomains.some(domain => 
            url.host === domain || url.host === `www.${domain}`
        );

        if (!isAmazonDomain) {
            return false;
        }

        // Check if it's a product page or a short URL
        if (url.host === 'amzn.to' || url.host === 'amzn.com') {
            return AMAZON_SHORT_URL_REGEX.test(url.pathname);
        }
        
        return AMAZON_PRODUCT_PATH_REGEX.test(url.pathname);
    }

    /**
     * Extract clean product data from Amazon HTML
     * @param {string} html
     * @param {URL} url
     * @returns {object}
     */
    extractProductData(html, url) {
        const $ = cheerio.load(html);
        
        // Extract product title - Amazon uses different selectors
        let title = $('#productTitle').text().trim() ||
                   $('h1#title').text().trim() ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="title"]').attr('content') ||
                   $('title').text().trim();

        // Clean up the title (remove "Amazon.com: " prefix if present)
        if (title) {
            title = title.replace(/^Amazon(\.[a-z]+)?:\s*/i, '').trim();
        }

        // Extract description - use feature bullets or product description
        let description = '';
        
        // Try to get feature bullets first
        const features = [];
        $('#feature-bullets li span.a-list-item').each((i, el) => {
            const text = $(el).text().trim();
            if (text && !text.includes('Make sure this fits')) {
                features.push(text);
            }
        });
        
        if (features.length > 0) {
            description = features.slice(0, 3).join(' • ');
        } else {
            // Fallback to meta description
            description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         '';
        }

        // Extract product image
        let image = $('meta[property="og:image"]').attr('content') ||
                   $('#landingImage').attr('src') ||
                   $('#imgBlkFront').attr('src') ||
                   $('#main-image').attr('src') ||
                   $('.image-container img').first().attr('src');

        // Extract price if available
        let price = $('.a-price-whole').first().text().trim() ||
                   $('span.a-price').first().text().trim() ||
                   '';

        // Extract author/brand
        let author = $('#bylineInfo').text().trim() ||
                    $('.by-line a').first().text().trim() ||
                    $('#brand').text().trim() ||
                    '';
        
        if (author) {
            author = author.replace(/^(by|Brand:)\s*/i, '').trim();
        }

        // Build a proper description if we only have title
        if (!description && title) {
            description = `View product details for ${title} on Amazon`;
        }

        return {
            title: title || 'Amazon Product',
            description: description,
            image: image,
            author: author,
            price: price,
            url: url.href
        };
    }

    /**
     * @param {URL} url
     * @param {IExternalRequest} externalRequest
     *
     * @returns {Promise<object>}
     */
    async getOEmbedData(url, externalRequest) {
        try {
            // Fetch the Amazon product page
            const response = await externalRequest(url.href, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 5000,
                followRedirect: true
            });

            const productData = this.extractProductData(response.body, url);

            // Return in bookmark format since Amazon doesn't provide oEmbed
            return {
                version: '1.0',
                type: 'bookmark',
                url: url.href,
                metadata: {
                    title: productData.title,
                    description: productData.description,
                    author: productData.author,
                    publisher: 'Amazon',
                    thumbnail: productData.image,
                    icon: 'https://www.amazon.com/favicon.ico'
                }
            };
        } catch (err) {
            logging.error('Failed to fetch Amazon product data', err);
            
            // Return a basic bookmark with minimal data
            return {
                version: '1.0',
                type: 'bookmark',
                url: url.href,
                metadata: {
                    title: 'Amazon Product',
                    description: 'View this product on Amazon',
                    publisher: 'Amazon',
                    icon: 'https://www.amazon.com/favicon.ico'
                }
            };
        }
    }
}

module.exports = AmazonOEmbedProvider;