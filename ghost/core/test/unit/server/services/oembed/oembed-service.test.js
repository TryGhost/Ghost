const assert = require('node:assert/strict');
const nock = require('nock');
const got = require('got');
const sinon = require('sinon');

const OembedService = require('../../../../../core/server/services/oembed/oembed-service');

describe('oembed-service', function () {
    /** @type {OembedService} */
    let oembedService;

    before(function () {
        oembedService = new OembedService({
            config: {get() {
                return true;
            }},
            externalRequest: got
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
    });

    describe('processImageFromUrl', function () {
        it('stores downloaded bookmark assets via image storage and returns stored URL', async function () {
            const saveRaw = sinon.stub().resolves('https://storage.ghost.is/c/6f/a3/site/content/images/thumbnail/sample.png');
            const generateUnique = sinon.stub().resolves('/tmp/content/images/thumbnail/sample.png');
            const getSanitizedFileName = sinon.stub().returns('sample');

            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                storage: {
                    getStorage() {
                        return {
                            getSanitizedFileName,
                            generateUnique,
                            saveRaw
                        };
                    }
                },
                externalRequest() {
                    return {
                        buffer: async () => Buffer.from('img-bytes')
                    };
                }
            });

            const storedUrl = await service.processImageFromUrl('https://example.com/sample.png?token=abc', 'thumbnail');

            assert.equal(storedUrl, 'https://storage.ghost.is/c/6f/a3/site/content/images/thumbnail/sample.png');
            sinon.assert.calledOnce(getSanitizedFileName);
            sinon.assert.calledOnce(generateUnique);
            sinon.assert.calledOnce(saveRaw);
            assert.equal(saveRaw.firstCall.args[1], 'thumbnail/sample.png');
        });
    });

    describe('metascraper inherits externalRequest hooks', function () {
        it('should apply externalRequest beforeRequest hooks to metascraper favicon fetches', async function () {
            // metascraper-logo-favicon probes {origin}/favicon.ico via reachable-url.
            // gotOpts must carry externalRequest's hooks so those probes are validated.
            nock('http://169.254.169.254')
                .get('/favicon.ico')
                .reply(200, 'secret', {'content-type': 'image/png'});

            const beforeRequestHook = sinon.stub().callsFake(async function blockPrivateIPs(options) {
                if (options.url.hostname === '169.254.169.254') {
                    throw new Error('URL resolves to a non-permitted private IP block');
                }
            });

            const externalRequest = got.extend({
                retry: {limit: 0, calculateDelay: () => 0},
                timeout: 5000,
                hooks: {
                    init: [],
                    beforeRequest: [beforeRequestHook],
                    beforeRedirect: []
                }
            });

            externalRequest.head = sinon.stub().rejects(new Error('blocked'));

            const service = new OembedService({
                config: {
                    get: sinon.stub().returns('testing'),
                    getContentPath: sinon.stub().returns('/tmp/content/images')
                },
                externalRequest,
                storage: {
                    getStorage: sinon.stub().returns({
                        getSanitizedFileName: sinon.stub().returns('favicon'),
                        generateUnique: sinon.stub().resolves('/tmp/content/images/icon/favicon.png'),
                        saveRaw: sinon.stub().resolves('/content/images/icon/favicon.png')
                    })
                }
            });

            const html = `<html><head><title>Test Page</title></head><body></body></html>`;

            await service.fetchBookmarkData('http://169.254.169.254/page', html, 'mention');

            // The hook must have been called by metascraper's favicon probe,
            // proving gotOpts inherited the externalRequest hooks
            const faviconCall = beforeRequestHook.getCalls().find(
                call => call.args[0].url.pathname === '/favicon.ico'
            );
            assert.ok(faviconCall, 'beforeRequest hook should have been called for the favicon fetch');
        });
    });
});
