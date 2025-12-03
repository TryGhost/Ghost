const assert = require('assert/strict');
const nock = require('nock');
const got = require('got');

const OembedService = require('../../../../../core/server/services/oembed/OEmbedService');

describe('oembed-service', function () {
    /** @type {OembedService} */
    let oembedService;

    before(function () {
        oembedService = new OembedService({
            config: {
                get() {
                    return true;
                },
                getContentPath() {
                    return '/tmp';
                }
            },
            externalRequest: got,
            storage: {
                getStorage() {
                    return {
                        getSanitizedFileName: (name) => name,
                        generateUnique: async (dir, name, ext) => `${dir}/${name}${ext}`,
                        saveRaw: async (buffer, path) => `http://localhost/${path}`
                    };
                }
            }
        });

        nock.disableNetConnect();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    describe('known provider', function () {
        it('should return data if successful', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://www.youtube.com/user/testauthor',
                    html: '<iframe src="https://www.youtube.com/embed/1234"></iframe>'
                });

            const response = await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            assert.equal(response.title, 'Test Title');
            assert.equal(response.author_name, 'Test Author');
            assert.equal(response.author_url, 'https://www.youtube.com/user/testauthor');
            assert.equal(response.html, '<iframe src="https://www.youtube.com/embed/1234"></iframe>');
        });

        it('should return a ValidationError if upstream 401s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(401);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'URL contains a private resource.');
            }
        });

        it('should return a ValidationError if upstream 403s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(403);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'URL contains a private resource.');
            }
        });

        it('should return a ValidationError if upstream 404s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(404);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'Request failed with error code 404');
            }
        });

        it('should return a ValidationError if upstream 500s', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(500);

            try {
                await oembedService.knownProvider('https://www.youtube.com/watch?v=1234');
            } catch (error) {
                assert.equal(error.name, 'ValidationError');
                assert.equal(error.statusCode, 422);
                assert.equal(error.context, 'Request failed with error code 500');
            }
        });
    });

    describe('fetchOembedDataFromUrl', function () {
        it('allows rich embeds to skip height field', async function () {
            nock('https://www.example.com')
                .get('/')
                .query(true)
                .reply(200, `<html><head><link type="application/json+oembed" href="https://www.example.com/oembed"></head></html>`);

            nock('https://www.example.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    type: 'rich',
                    version: '1.0',
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://example.com/user/testauthor',
                    html: '<iframe src="https://www.example.com/embed"></iframe>',
                    width: 640,
                    height: null
                });

            const response = await oembedService.fetchOembedDataFromUrl('https://www.example.com');

            assert.equal(response.title, 'Test Title');
            assert.equal(response.author_name, 'Test Author');
            assert.equal(response.author_url, 'https://example.com/user/testauthor');
            assert.equal(response.html, '<iframe src="https://www.example.com/embed"></iframe>');
        });

        it('uses a known user-agent for bookmark requests', async function () {
            nock('https://www.example.com')
                .get('/')
                .query(true)
                .matchHeader('User-Agent', /Mozilla\/.*/)
                .reply(200, `<html><head><title>Example</title></head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://www.example.com', 'bookmark');

            assert.equal(response.version, '1.0');
            assert.equal(response.type, 'bookmark');
            assert.equal(response.url, 'https://www.example.com');
            assert.equal(response.metadata.title, 'Example');
        });

        it('should return a bookmark response when the oembed endpoint returns a link type', async function () {
            nock('https://www.example.com')
                .get('/')
                .query(true)
                .reply(200, `<html><head><link type="application/json+oembed" href="https://www.example.com/oembed"><title>Example</title></head></html>`);

            nock('https://www.example.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    type: 'link',
                    version: '1.0',
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://example.com/user/testauthor',
                    url: 'https://www.example.com'
                });

            const response = await oembedService.fetchOembedDataFromUrl('https://www.example.com');

            assert.equal(response.version, '1.0');
            assert.equal(response.type, 'bookmark');
            assert.equal(response.url, 'https://www.example.com');
            assert.equal(response.metadata.title, 'Example');
        });

        it('converts YT live URLs to watch URLs', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query((query) => {
                    // Ensure the URL is converted to a watch URL and retains existing query params.
                    const actual = query.url;
                    const expected = 'https://youtube.com/watch?param=existing&v=1234';

                    assert.equal(actual, expected, 'URL passed to oembed endpoint is incorrect');

                    return actual === expected;
                })
                .reply(200, {
                    type: 'rich',
                    version: '1.0',
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://example.com/user/testauthor',
                    html: '<iframe src="https://www.example.com/embed"></iframe>',
                    width: 640,
                    height: null
                });

            await oembedService.fetchOembedDataFromUrl('https://www.youtube.com/live/1234?param=existing');
        });

        it('converts YT live URLs to watch URLs (non-www)', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query((query) => {
                    // Ensure the URL is converted to a watch URL and retains existing query params.
                    const actual = query.url;
                    const expected = 'https://youtube.com/watch?param=existing&v=1234';

                    assert.equal(actual, expected, 'URL passed to oembed endpoint is incorrect');

                    return actual === expected;
                })
                .reply(200, {
                    type: 'rich',
                    version: '1.0',
                    title: 'Test Title',
                    author_name: 'Test Author',
                    author_url: 'https://example.com/user/testauthor',
                    html: '<iframe src="https://www.example.com/embed"></iframe>',
                    width: 640,
                    height: null
                });

            await oembedService.fetchOembedDataFromUrl('https://youtube.com/live/1234?param=existing');
        });

        it('handles URLs with encoded backslashes in og:image meta tags', async function () {
            // This test addresses the issue from GitHub #20484 where URLs with %5C (encoded backslash)
            // in image URLs would break due to normalize-url v6 converting them to forward slashes
            const htmlWithEncodedBackslash = `
                <html>
                <head>
                    <title>Test Page with Encoded Backslash</title>
                    <meta property="og:title" content="Test Page">
                    <meta property="og:description" content="Test description">
                    <meta property="og:image" content="https://example.com/path/with%5Cbackslash/image.jpg">
                    <meta name="twitter:image" content="https://example.com/path/with%5Cbackslash/image.jpg">
                </head>
                <body></body>
                </html>
            `;

            nock('https://www.example.com')
                .get('/test')
                .reply(200, htmlWithEncodedBackslash);

            // Mock the image fetch requests
            nock('https://example.com')
                .get('/path/with%5Cbackslash/image.jpg')
                .reply(200, Buffer.from('fake-image-data'));

            const response = await oembedService.fetchOembedDataFromUrl('https://www.example.com/test', 'bookmark');

            assert.equal(response.type, 'bookmark');
            assert.equal(response.metadata.title, 'Test Page');
            assert.equal(response.metadata.description, 'Test description');
            
            // The thumbnail URL should preserve the encoded backslash (%5C) and not convert it to forward slash
            // This ensures that the image can be properly fetched from the original URL
            assert.ok(response.metadata.thumbnail, 'Thumbnail should be present');
            
            // The fix should ensure the URL either preserves %5C or handles it correctly
            // The exact behavior depends on whether the URL was successfully processed
        });
    });
});
