const assert = require('assert/strict');
const sinon = require('sinon');
const nock = require('nock');

const AmazonOEmbedProvider = require('../../../../../core/server/services/oembed/AmazonOEmbedProvider');

describe('AmazonOEmbedProvider', function () {
    let provider;
    let externalRequest;

    beforeEach(function () {
        externalRequest = sinon.stub();
        provider = new AmazonOEmbedProvider({config: {}});
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('canSupportRequest', function () {
        it('should return true for Amazon product URLs', async function () {
            const tests = [
                'https://www.amazon.com/Harry-Potter-Sorcerers-Stone-Book/dp/B017V4IMVQ/',
                'https://www.amazon.com/dp/B017V4IMVQ',
                'https://amazon.com/gp/product/B017V4IMVQ',
                'https://www.amazon.co.uk/dp/B017V4IMVQ',
                'https://www.amazon.de/dp/B017V4IMVQ',
                'https://www.amazon.co.jp/dp/B017V4IMVQ',
                'https://amzn.to/B017V4IMVQ'
            ];

            for (const testUrl of tests) {
                const url = new URL(testUrl);
                const result = await provider.canSupportRequest(url);
                assert.equal(result, true, `Should support ${testUrl}`);
            }
        });

        it('should return false for non-Amazon URLs', async function () {
            const tests = [
                'https://www.example.com/product',
                'https://www.youtube.com/watch?v=123',
                'https://twitter.com/status/123'
            ];

            for (const testUrl of tests) {
                const url = new URL(testUrl);
                const result = await provider.canSupportRequest(url);
                assert.equal(result, false, `Should not support ${testUrl}`);
            }
        });

        it('should return false for non-product Amazon URLs', async function () {
            const tests = [
                'https://www.amazon.com/',
                'https://www.amazon.com/s?k=books',
                'https://www.amazon.com/gp/help/customer/display.html'
            ];

            for (const testUrl of tests) {
                const url = new URL(testUrl);
                const result = await provider.canSupportRequest(url);
                assert.equal(result, false, `Should not support ${testUrl}`);
            }
        });
    });

    describe('extractProductData', function () {
        it('should extract product data from Amazon HTML', function () {
            const html = `
                <html>
                    <head>
                        <title>Amazon.com: Harry Potter and the Sorcerer's Stone</title>
                        <meta property="og:title" content="Harry Potter and the Sorcerer's Stone" />
                        <meta property="og:description" content="A wonderful book about a wizard" />
                        <meta property="og:image" content="https://example.com/image.jpg" />
                    </head>
                    <body>
                        <h1 id="productTitle">Harry Potter and the Sorcerer's Stone</h1>
                        <div id="bylineInfo">by J.K. Rowling</div>
                        <div id="feature-bullets">
                            <ul>
                                <li><span class="a-list-item">First feature</span></li>
                                <li><span class="a-list-item">Second feature</span></li>
                            </ul>
                        </div>
                        <span class="a-price-whole">19.99</span>
                    </body>
                </html>
            `;

            const url = new URL('https://www.amazon.com/dp/B017V4IMVQ');
            const data = provider.extractProductData(html, url);

            assert.equal(data.title, 'Harry Potter and the Sorcerer\'s Stone');
            assert.equal(data.description, 'First feature • Second feature');
            assert.equal(data.author, 'J.K. Rowling');
            assert.equal(data.image, 'https://example.com/image.jpg');
            assert.equal(data.price, '19.99');
        });

        it('should handle missing data gracefully', function () {
            const html = '<html><head><title>Amazon Product</title></head><body></body></html>';
            const url = new URL('https://www.amazon.com/dp/B017V4IMVQ');
            const data = provider.extractProductData(html, url);

            assert.equal(data.title, 'Amazon Product');
            assert.ok(data.description);
            assert.equal(data.url, 'https://www.amazon.com/dp/B017V4IMVQ');
        });

        it('should clean Amazon prefix from title', function () {
            const html = `
                <html>
                    <head>
                        <title>Amazon.com: Product Title Here</title>
                    </head>
                </html>
            `;

            const url = new URL('https://www.amazon.com/dp/B017V4IMVQ');
            const data = provider.extractProductData(html, url);

            assert.equal(data.title, 'Product Title Here');
        });
    });

    describe('getOEmbedData', function () {
        it('should return bookmark data for Amazon product', async function () {
            const html = `
                <html>
                    <head>
                        <title>Harry Potter Book</title>
                        <meta property="og:image" content="https://example.com/book.jpg" />
                    </head>
                    <body>
                        <h1 id="productTitle">Harry Potter and the Sorcerer's Stone</h1>
                        <div id="bylineInfo">by J.K. Rowling</div>
                    </body>
                </html>
            `;

            externalRequest.resolves({
                body: html,
                headers: {'content-type': 'text/html'}
            });

            const url = new URL('https://www.amazon.com/dp/B017V4IMVQ');
            const result = await provider.getOEmbedData(url, externalRequest);

            assert.equal(result.type, 'bookmark');
            assert.equal(result.version, '1.0');
            assert.equal(result.url, 'https://www.amazon.com/dp/B017V4IMVQ');
            assert.equal(result.metadata.title, 'Harry Potter and the Sorcerer\'s Stone');
            assert.equal(result.metadata.author, 'J.K. Rowling');
            assert.equal(result.metadata.publisher, 'Amazon');
            assert.equal(result.metadata.thumbnail, 'https://example.com/book.jpg');
            assert.equal(result.metadata.icon, 'https://www.amazon.com/favicon.ico');
        });

        it('should return fallback data on error', async function () {
            externalRequest.rejects(new Error('Network error'));

            const url = new URL('https://www.amazon.com/dp/B017V4IMVQ');
            const result = await provider.getOEmbedData(url, externalRequest);

            assert.equal(result.type, 'bookmark');
            assert.equal(result.version, '1.0');
            assert.equal(result.metadata.title, 'Amazon Product');
            assert.equal(result.metadata.publisher, 'Amazon');
        });
    });
});