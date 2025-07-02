const assert = require('assert/strict');
const nock = require('nock');
const got = require('got');

const OembedService = require('../../../../../core/server/services/oembed/OEmbedService');

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
});
