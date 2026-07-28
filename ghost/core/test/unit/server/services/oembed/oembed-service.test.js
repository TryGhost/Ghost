const assert = require('node:assert/strict');
const nock = require('nock');
const got = require('got').default;
const sinon = require('sinon');

const OembedService = require('../../../../../core/server/services/oembed/oembed-service');

describe('oembed-service', function () {
    /** @type {OembedService} */
    let oembedService;

    beforeAll(function () {
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

    describe('fetchPage', function () {
        it('requests pages with a 5 second timeout', async function () {
            const externalRequest = sinon.stub().resolves({});

            const service = new OembedService({
                config: {get() {
                    return true;
                }},
                externalRequest
            });

            await service.fetchPage('https://www.example.com', {});

            const options = externalRequest.firstCall.args[1];
            assert.equal(options.timeout.request, 5000);
        });
    });

    describe('fetchOembedData', function () {
        const pageHtml = `<html><head><link type="application/json+oembed" href="https://www.example.com/oembed"></head></html>`;

        it('drops rich-type responses from non-allowlisted providers (ONC-1648)', async function () {
            // Self-declared oEmbed endpoints for arbitrary sites cannot be trusted
            // to return safe HTML — known providers (Twitter, YouTube, …) go through
            // `knownProvider` which uses an allowlist. Rich/video responses reaching
            // this fallback path must not propagate their html into post content.
            nock('https://www.example.com')
                .get('/oembed')
                .reply(200, {
                    type: 'rich',
                    version: '1.0',
                    title: 'Test Title',
                    html: '<img src=x onerror="alert(1)">',
                    width: 640,
                    height: 480
                });

            const response = await oembedService.fetchOembedData('https://www.example.com', pageHtml);

            // Returning undefined signals the caller to fall back to a bookmark
            // card instead of storing the attacker-controlled html.
            assert.equal(response, undefined);
        });

        it('drops video-type responses from non-allowlisted providers (ONC-1648)', async function () {
            nock('https://www.example.com')
                .get('/oembed')
                .reply(200, {
                    type: 'video',
                    version: '1.0',
                    title: 'Test Title',
                    html: '<iframe src="javascript:alert(1)"></iframe>',
                    width: 640,
                    height: 480
                });

            const response = await oembedService.fetchOembedData('https://www.example.com', pageHtml);

            assert.equal(response, undefined);
        });

        it('still returns photo-type responses from non-allowlisted providers', async function () {
            nock('https://www.example.com')
                .get('/oembed')
                .reply(200, {
                    type: 'photo',
                    version: '1.0',
                    title: 'Test Title',
                    url: 'https://www.example.com/photo.jpg',
                    width: 640,
                    height: 480
                });

            const response = await oembedService.fetchOembedData('https://www.example.com', pageHtml);

            assert.equal(response.type, 'photo');
            assert.equal(response.url, 'https://www.example.com/photo.jpg');
        });
    });

    describe('fetchOembedDataFromUrl', function () {
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

        it('extracts Amazon product metadata via the metascraper-amazon ruleset', async function () {
            nock('https://www.amazon.com')
                .get('/dp/B08N5WRWNW')
                .query(true)
                .reply(200, `<html><head><title>Amazon.com</title></head><body>
                    <span id="productTitle">Example Product Title</span>
                    <img class="a-dynamic-image" src="https://m.media-amazon.com/images/I/example.jpg" data-old-hires="https://m.media-amazon.com/images/I/example-hires.jpg">
                </body></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://www.amazon.com/dp/B08N5WRWNW', 'bookmark');

            assert.equal(response.version, '1.0');
            assert.equal(response.type, 'bookmark');
            assert.equal(response.metadata.title, 'Example Product Title');
            assert.equal(response.metadata.publisher, 'Amazon');
            assert.equal(response.metadata.thumbnail, 'https://m.media-amazon.com/images/I/example-hires.jpg');
        });

        it('does not apply Amazon rules to .co hosts that merely end in "a.co"', async function () {
            nock('https://www.rangemedia.co')
                .get('/some-post')
                .query(true)
                .reply(200, `<html><head>
                    <title>Some Post</title>
                    <meta property="og:site_name" content="RANGE Media">
                </head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://www.rangemedia.co/some-post', 'bookmark');

            assert.equal(response.metadata.publisher, 'RANGE Media');
        });

        it('does not apply Amazon rules to subdomain spoofs (amazon.evil.com)', async function () {
            nock('https://amazon.evil.com')
                .get('/x')
                .query(true)
                .reply(200, `<html><head>
                    <title>Evil Page</title>
                    <meta property="og:site_name" content="Evil Site">
                </head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://amazon.evil.com/x', 'bookmark');

            assert.equal(response.metadata.publisher, 'Evil Site');
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

        it('enriches other allowlisted provider bookmarks without discarding page metadata', async function () {
            const knownProviderStub = sinon.stub(oembedService, 'knownProvider')
                .resolves({
                    title: 'Vimeo oEmbed title',
                    author_name: 'Vimeo author',
                    provider_name: 'Vimeo',
                    thumbnail_url: 'https://i.vimeocdn.com/video/123.jpg'
                });

            sinon.stub(oembedService, 'processImageFromUrl').callsFake(async imageUrl => imageUrl);

            nock('https://vimeo.com')
                .get('/123456')
                .query(true)
                .reply(200, `<html><head>
                    <title>Vimeo page title</title>
                    <meta name="description" content="Vimeo page description">
                    <link rel="icon" href="https://vimeo.com/favicon.ico">
                </head></html>`);

            try {
                const response = await oembedService.fetchOembedDataFromUrl('https://vimeo.com/123456', 'bookmark');

                assert.equal(response.metadata.title, 'Vimeo oEmbed title');
                assert.equal(response.metadata.description, 'Vimeo page description');
                assert.equal(response.metadata.author, 'Vimeo author');
                assert.equal(response.metadata.publisher, 'Vimeo');
                assert.equal(response.metadata.thumbnail, 'https://i.vimeocdn.com/video/123.jpg');
                assert.equal(response.metadata.icon, 'https://vimeo.com/favicon.ico');
                sinon.assert.calledOnce(knownProviderStub);
            } finally {
                sinon.restore();
            }
        });

        it('falls back to page metadata when YouTube oEmbed fails', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(404);

            nock('https://www.youtube.com')
                .get('/watch')
                .query({v: 'unavailable'})
                .reply(200, `<html><head>
                    <title>Fallback YouTube page title</title>
                </head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://www.youtube.com/watch?v=unavailable', 'bookmark');

            assert.equal(response.metadata.title, 'Fallback YouTube page title');
        });

        it('uses bookmark enrichment when the provider page request fails', async function () {
            const thumbnailUrl = 'https://i.ytimg.com/vi/blocked/hqdefault.jpg';
            sinon.stub(oembedService, 'processImageFromUrl').resolves('/content/images/thumbnail/youtube.jpg');

            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    title: 'YouTube oEmbed title',
                    author_name: 'YouTube author',
                    provider_name: 'YouTube',
                    thumbnail_url: thumbnailUrl,
                    type: 'video',
                    version: '1.0'
                });

            nock('https://www.youtube.com')
                .get('/watch')
                .query({v: 'blocked'})
                .reply(403);

            try {
                const response = await oembedService.fetchOembedDataFromUrl('https://www.youtube.com/watch?v=blocked', 'bookmark');

                assert.equal(response.metadata.title, 'YouTube oEmbed title');
                assert.equal(response.metadata.author, 'YouTube author');
                assert.equal(response.metadata.publisher, 'YouTube');
                assert.equal(response.metadata.thumbnail, '/content/images/thumbnail/youtube.jpg');
                assert.equal(response.metadata.icon, 'https://static.ghost.org/v5.0.0/images/link-icon.svg');
            } finally {
                sinon.restore();
            }
        });

        it('falls back to page metadata when bookmark enrichment times out', async function () {
            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .delayConnection(500)
                .reply(200, {
                    title: 'Late YouTube oEmbed title',
                    type: 'video',
                    version: '1.0'
                });

            nock('https://www.youtube.com')
                .get('/watch')
                .query({v: 'slow'})
                .reply(200, `<html><head>
                    <title>Timely YouTube page title</title>
                </head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl(
                'https://www.youtube.com/watch?v=slow',
                'bookmark',
                {timeout: {request: 200}}
            );

            assert.equal(response.metadata.title, 'Timely YouTube page title');
        });

        it('does not process missing bookmark images', async function () {
            const processImageFromUrlStub = sinon.stub(oembedService, 'processImageFromUrl')
                .callsFake(async imageUrl => imageUrl);

            try {
                const response = await oembedService.fetchBookmarkData('https://www.example.com', '<html><head><title>Example</title></head></html>', 'bookmark');

                assert.equal(response.metadata.title, 'Example');
                assert.equal(response.metadata.thumbnail, null);
                assert.equal(response.metadata.icon, 'https://static.ghost.org/v5.0.0/images/link-icon.svg');
                sinon.assert.notCalled(processImageFromUrlStub);
            } finally {
                sinon.restore();
            }
        });

        // Regression coverage for https://github.com/TryGhost/Ghost/issues/24741
        // A YouTube bookmark request must build the card from the allowlisted
        // oEmbed provider metadata (video title/author/publisher/thumbnail)
        // rather than the generic scraped page, and must never leak the
        // provider embed HTML into the bookmark card.
        it('builds a YouTube bookmark card from allowlisted oEmbed provider metadata (#24741)', async function () {
            const thumbnailUrl = 'https://i.ytimg.com/vi/0i1Xz-xiYSU/hqdefault.jpg';
            const processImageFromUrlStub = sinon.stub(oembedService, 'processImageFromUrl')
                .resolves('/content/images/thumbnail/youtube.jpg');

            nock('https://www.youtube.com')
                .get('/watch')
                .query({v: '0i1Xz-xiYSU'})
                .reply(200, `<html><head>
                    <title>Generic YouTube page title</title>
                    <meta name="description" content="Description from the page">
                </head></html>`);

            nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    title: 'What happens in the European Space Agency\'s Mission Control?',
                    author_name: 'Matt Gray',
                    author_url: 'https://www.youtube.com/@MattGrayYES',
                    type: 'video',
                    version: '1.0',
                    provider_name: 'YouTube',
                    provider_url: 'https://www.youtube.com/',
                    thumbnail_url: thumbnailUrl,
                    html: '<iframe src="https://www.youtube.com/embed/0i1Xz-xiYSU"></iframe>',
                    width: 200,
                    height: 113
                });

            try {
                const response = await oembedService.fetchOembedDataFromUrl('https://www.youtube.com/watch?v=0i1Xz-xiYSU', 'bookmark');

                assert.equal(response.version, '1.0');
                assert.equal(response.type, 'bookmark');
                assert.equal(response.url, 'https://www.youtube.com/watch?v=0i1Xz-xiYSU');
                assert.equal(response.metadata.url, 'https://www.youtube.com/watch?v=0i1Xz-xiYSU');
                assert.equal(response.metadata.title, 'What happens in the European Space Agency\'s Mission Control?');
                assert.equal(response.metadata.description, 'Description from the page');
                assert.equal(response.metadata.author, 'Matt Gray');
                assert.equal(response.metadata.publisher, 'YouTube');
                assert.equal(response.metadata.thumbnail, '/content/images/thumbnail/youtube.jpg');
                assert.equal(response.metadata.icon, 'https://static.ghost.org/v5.0.0/images/link-icon.svg');
                sinon.assert.calledOnceWithExactly(processImageFromUrlStub, thumbnailUrl, 'thumbnail');
                // The provider embed HTML must not leak into the bookmark card
                assert.equal(response.metadata.html, undefined);
                assert.equal(response.html, undefined);
            } finally {
                sinon.restore();
            }
        });

        it('prefers the standard favicon over an apple-touch-icon in the bookmark fallback', async function () {
            // With no oembed endpoint and no explicit type, fetchOembedDataFromUrl
            // falls through to the bookmark fallback (!data && !type). That path
            // resolves to a bookmark card, so it must pick the standard favicon,
            // not the apple-touch-icon reserved for scaled-up call sites.
            sinon.stub(oembedService, 'processImageFromUrl').callsFake(async imageUrl => imageUrl);

            nock('https://www.example.com')
                .get('/')
                .query(true)
                .reply(200, `<html><head>
                    <title>Example</title>
                    <link rel="apple-touch-icon" sizes="180x180" href="https://www.example.com/apple.png">
                    <link rel="icon" href="https://www.example.com/favicon.png">
                </head></html>`);

            const response = await oembedService.fetchOembedDataFromUrl('https://www.example.com');

            assert.equal(response.type, 'bookmark');
            assert.equal(response.metadata.icon, 'https://www.example.com/favicon.png');

            sinon.restore();
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

        it('keeps unknown provider fallback by default when the page fetch fails', async function () {
            const fetchError = new Error('Service Unavailable');
            fetchError.response = {
                statusCode: 503
            };

            const service = new OembedService({
                config: {get() {
                    return true;
                }},
                externalRequest() {
                    throw fetchError;
                }
            });

            await assert.rejects(
                () => service.fetchOembedDataFromUrl('https://www.example.com', 'mention'),
                {
                    name: 'ValidationError',
                    message: 'No provider found for supplied URL.'
                }
            );
        });

        it('does not pass the rethrow callback to the external request', async function () {
            const service = new OembedService({
                config: {get() {
                    return true;
                }},
                externalRequest(url, options) {
                    assert.equal(url, 'https://www.example.com');
                    assert.equal(options.shouldRethrowFetchError, undefined);

                    return {
                        headers: {
                            'content-type': 'text/html'
                        },
                        body: Buffer.from('<html><head><title>Example</title></head></html>'),
                        url
                    };
                }
            });

            const response = await service.fetchOembedDataFromUrl('https://www.example.com', 'bookmark', {
                shouldRethrowFetchError() {
                    return true;
                }
            });

            assert.equal(response.metadata.title, 'Example');
        });

        it('allows callers to rethrow selected page fetch errors', async function () {
            const fetchError = new Error('Service Unavailable');
            fetchError.response = {
                statusCode: 503
            };

            const service = new OembedService({
                config: {get() {
                    return true;
                }},
                externalRequest() {
                    throw fetchError;
                }
            });

            await assert.rejects(
                () => service.fetchOembedDataFromUrl('https://www.example.com', 'mention', {
                    shouldRethrowFetchError(err) {
                        return err.response?.statusCode === 503;
                    }
                }),
                (err) => {
                    assert.equal(err, fetchError);
                    assert.equal(err.response.statusCode, 503);
                    return true;
                }
            );
        });
    });

    describe('processImageFromUrl', function () {
        const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

        it('returns null without fetching when the image URL is missing', async function () {
            const externalRequest = sinon.stub();
            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName: sinon.stub().throws(new Error('getSanitizedFileName should not be called')),
                    saveRaw: sinon.stub().throws(new Error('saveRaw should not be called'))
                },
                externalRequest
            });

            const storedUrl = await service.processImageFromUrl(null, 'thumbnail');

            assert.equal(storedUrl, null);
            sinon.assert.notCalled(externalRequest);
        });

        it('stores downloaded bookmark assets via image storage and returns the adapter URL', async function () {
            const imageBytes = Buffer.from('img-bytes');
            const saveRaw = sinon.stub().resolves('https://storage.ghost.is/c/6f/a3/site/content/images/thumbnail/sample-x.png');
            const getSanitizedFileName = sinon.stub().returns('sample');

            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName,
                    saveRaw
                },
                externalRequest() {
                    return {
                        buffer: async () => imageBytes
                    };
                }
            });

            const storedUrl = await service.processImageFromUrl('https://example.com/sample.png?token=abc', 'thumbnail');

            // the adapter's own return value is passed straight through
            assert.equal(storedUrl, 'https://storage.ghost.is/c/6f/a3/site/content/images/thumbnail/sample-x.png');
            sinon.assert.calledOnce(getSanitizedFileName);
            sinon.assert.calledOnce(saveRaw);
            assert.match(saveRaw.firstCall.args[1], new RegExp(`^thumbnail/sample-${UUID_RE.source}\\.png$`));
        });

        it('writes a fresh key on every call, even for identical bytes (ONC-1788)', async function () {
            // A content hash would collide here and force an overwrite, which the
            // production bucket rejects. A unique key avoids the overwrite entirely.
            const imageBytes = Buffer.from('ico-bytes');
            const saveRaw = sinon.stub().resolves('/stored');
            const getSanitizedFileName = sinon.stub().returns('favicon');

            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName,
                    saveRaw
                },
                externalRequest() {
                    return {
                        buffer: async () => imageBytes
                    };
                }
            });

            await service.processImageFromUrl('https://a.example.com/favicon.ico', 'icon');
            await service.processImageFromUrl('https://b.example.com/favicon.ico', 'icon');

            assert.match(saveRaw.firstCall.args[1], new RegExp(`^icon/favicon-${UUID_RE.source}\\.ico$`));
            assert.match(saveRaw.secondCall.args[1], new RegExp(`^icon/favicon-${UUID_RE.source}\\.ico$`));
            assert.notEqual(saveRaw.firstCall.args[1], saveRaw.secondCall.args[1]);
        });

        it('only ever creates - never probes exists or attempts a second write', async function () {
            // The no-overwrite property: unique keys mean we always create and
            // never need to check-for or replace an existing object.
            const saveRaw = sinon.stub().resolves('/stored');
            const exists = sinon.stub().resolves(true);
            const getSanitizedFileName = sinon.stub().returns('favicon');

            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName,
                    saveRaw,
                    exists
                },
                externalRequest() {
                    return {
                        buffer: async () => Buffer.from('bytes')
                    };
                }
            });

            await service.processImageFromUrl('https://example.com/favicon.png', 'icon');

            sinon.assert.calledOnce(saveRaw);
            sinon.assert.notCalled(exists);
        });

        it('does not call generateUnique (no per-write storage walk)', async function () {
            const generateUnique = sinon.stub().resolves('/should/not/be/called.png');
            const saveRaw = sinon.stub().resolves('/stored');
            const getSanitizedFileName = sinon.stub().returns('favicon');

            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName,
                    generateUnique,
                    saveRaw
                },
                externalRequest() {
                    return {
                        buffer: async () => Buffer.from('bytes')
                    };
                }
            });

            await service.processImageFromUrl('https://example.com/favicon.png', 'icon');

            sinon.assert.notCalled(generateUnique);
        });

        it('throws when storage lacks saveRaw', async function () {
            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName: sinon.stub().returns('sample')
                },
                externalRequest() {
                    return {
                        buffer: async () => Buffer.from('img-bytes')
                    };
                }
            });

            await assert.rejects(
                () => service.processImageFromUrl('https://example.com/sample.png', 'thumbnail'),
                {name: 'TypeError'}
            );
        });

        it('throws when external request fails', async function () {
            const service = new OembedService({
                config: {
                    getContentPath() {
                        return '/tmp/content/images';
                    }
                },
                imageStore: {
                    getSanitizedFileName: sinon.stub().returns('sample'),
                    saveRaw: sinon.stub().resolves('/stored')
                },
                externalRequest() {
                    throw new Error('Network error');
                }
            });

            await assert.rejects(
                () => service.processImageFromUrl('https://example.com/broken.png', 'thumbnail'),
                {message: 'Network error'}
            );
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
                timeout: {
                    request: 5000
                },
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
                imageStore: {
                    getSanitizedFileName: sinon.stub().returns('favicon'),
                    generateUnique: sinon.stub().resolves('/tmp/content/images/icon/favicon.png'),
                    saveRaw: sinon.stub().resolves('/content/images/icon/favicon.png')
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

    describe('fetchBookmarkData favicon selection', function () {
        // Icons declared as <link> tags are resolved by metascraper-logo-favicon
        // directly from the HTML, so these assertions exercise pickFn without
        // hitting the network favicon probe. The picked icon is normally
        // post-processed (downloaded for bookmarks, HEAD-checked for mentions),
        // so we stub both to surface pickFn's raw selection.
        let service;

        beforeEach(function () {
            const externalRequest = sinon.stub().resolves({});
            externalRequest.head = sinon.stub().resolves({});
            externalRequest.defaults = {options: {}};

            service = new OembedService({
                config: {get() {
                    return true;
                }},
                externalRequest
            });
            sinon.stub(service, 'processImageFromUrl').callsFake(async url => url);
        });

        afterEach(function () {
            sinon.restore();
        });

        const buildHtml = links => `<html><head><title>Test Page</title>${links}</head><body></body></html>`;

        const getIcon = (links, type) => service
            .fetchBookmarkData('https://example.com/page', buildHtml(links), type)
            .then(result => result.metadata.icon);

        it('bookmark cards prefer the standard favicon over an apple-touch-icon', async function () {
            const icon = await getIcon(`
                <link rel="apple-touch-icon" sizes="180x180" href="https://example.com/apple.png">
                <link rel="icon" href="https://example.com/favicon.png">
            `, 'bookmark');

            assert.equal(icon, 'https://example.com/favicon.png');
        });

        it('bookmark cards prefer an SVG favicon over other standard icons', async function () {
            const icon = await getIcon(`
                <link rel="icon" href="https://example.com/favicon.png">
                <link rel="icon" href="https://example.com/icon.svg">
            `, 'bookmark');

            assert.equal(icon, 'https://example.com/icon.svg');
        });

        it('bookmark cards skip mask-icon/fluid-icon silhouettes', async function () {
            const icon = await getIcon(`
                <link rel="mask-icon" href="https://example.com/mask.svg" color="#000000">
                <link rel="fluid-icon" href="https://example.com/fluid.png">
                <link rel="icon" href="https://example.com/favicon.png">
            `, 'bookmark');

            assert.equal(icon, 'https://example.com/favicon.png');
        });

        it('bookmark cards fall back to an apple-touch-icon when no standard favicon exists', async function () {
            const icon = await getIcon(`
                <link rel="apple-touch-icon" sizes="180x180" href="https://example.com/apple.png">
            `, 'bookmark');

            assert.equal(icon, 'https://example.com/apple.png');
        });

        it('mentions keep the apple-touch-icon priority for the scaled-up avatar', async function () {
            const icon = await getIcon(`
                <link rel="apple-touch-icon" sizes="180x180" href="https://example.com/apple.png">
                <link rel="icon" href="https://example.com/favicon.png">
            `, 'mention');

            assert.equal(icon, 'https://example.com/apple.png');
        });
    });
});
