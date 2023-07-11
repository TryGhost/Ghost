const MentionDiscoveryService = require('../lib/MentionDiscoveryService');
const sinon = require('sinon');
// non-standard to use externalRequest here, but this is required for the overrides in the library, which we want to test for security reasons in combination with the package
const externalRequest = require('../../core/core/server/lib/request-external.js');
const dnsPromises = require('dns').promises;
const assert = require('assert/strict');
const nock = require('nock');

describe('MentionDiscoveryService', function () {
    const service = new MentionDiscoveryService({externalRequest});

    beforeEach(function () {
        nock.disableNetConnect();
        // externalRequest does dns lookup; stub to make sure we don't fail with fake domain names
        sinon.stub(dnsPromises, 'lookup').callsFake(function () {
            return Promise.resolve({address: '123.123.123.123'});
        });
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    after(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    it('Returns null from a bad URL', async function () {
        const url = new URL('http://www.notarealsite.com/');
        nock(url.href)
            .get('/')
            .reply(404);
        let endpoint = await service.getEndpoint(url);

        assert.equal(endpoint, null);
    });

    it('Follows redirects', async function () {
        let url = new URL('http://redirector.io/');
        let nextUrl = new URL('http://testpage.com/');

        nock(url.href)
            .intercept('/', 'HEAD')
            .reply(301, undefined, {location: nextUrl.href})
            .get('/')
            .reply(200, '<link rel="webmention" href="http://valid.site.org" />Very cool site', {'content-type': 'text/html'});

        let endpoint = await service.getEndpoint(url);

        assert(endpoint instanceof URL);
    });

    describe('Can parse headers', function () {
        it('Returns null for a valid non-html site', async function () {
            const url = new URL('http://www.veryrealsite.com');
            nock(url.href)
                .get('/')
                .reply(200, {}, {'content-type': 'application/json'});
            const endpoint = await service.getEndpoint(url);

            assert.equal(endpoint, null);
        });

        it('Returns an endpoint from a site with a webmentions Link in the header', async function () {
            const url = new URL('http://testpage.com/');
            nock(url.href)
                .get('/')
                .reply(200, {}, {Link: '<http://webmentions.endpoint.io>; rel="webmention"'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://webmentions.endpoint.io/');
        });

        it('Returns null with Links in the header that are not for webmentions', async function () {
            const url = new URL('http://testpage.com/');
            nock(url.href)
                .get('/')
                .reply(200, {}, {Link: '<http://not.your.endpoint>; rel="preconnect"'});
            const endpoint = await service.getEndpoint(url);

            assert.equal(endpoint, null);
        });

        it('Returns with multiple Links in the header, one of which is for webmentions', async function () {
            const url = new URL('http://testpage.com/');
            nock(url.href)
                .get('/')
                .reply(200, {}, {Link: '<http://not.your.endpoint>; rel="preconnect",<http://webmentions.endpoint.io>; rel="webmention"'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://webmentions.endpoint.io/');
        });
    });

    describe('Can parse html', function () {
        it('Returns endpoint for valid html site with <link rel="webmention"> tag in body', async function () {
            const url = new URL('http://testpage.com/');
            nock(url.href)
                .get('/')
                .reply(200, '<link rel="webmention" href="http://webmentions.endpoint.io" />', {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://webmentions.endpoint.io/');
        });

        it('Returns endpoint for valid html site with <a rel="webmention"> tag in body', async function () {
            const url = new URL('http://testpage.com/');
            nock(url.href)
                .get('/')
                .reply(200, '<a rel="webmention" href="http://valid.site.org">webmention</a>', {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://valid.site.org/');
        });

        it('Returns first endpoint for valid html site with multiple <a> tags in body', async function () {
            const url = new URL('http://testpage.com/');
            const html = `
                    <a rel="bookmark" href="http://not.an.endpoint">kewl link 1</a>
                    <a rel="webmention" href="http://first.webmention.endpoint">kewl link 2</a>
                    <a rel="webmention" href="http://second.webmention.endpoint">kewl link 3</a>
                    <a rel="icon" href="http://not.an.endpoint">kewl link 4</a>
                `;
            nock(url.href)
                .get('/')
                .reply(200, html, {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://first.webmention.endpoint/');
        });

        it('Returns first endpoint for valid html site with multiple <link> tags in the header', async function () {
            const url = new URL('http://testpage.com/');
            const html = `
                    <link rel="bookmark" href="http://not.an.endpoint" />
                    <link rel="webmention" href="http://first.webmention.endpoint" />
                    <link rel="webmention" href="http://second.webmention.endpoint" />
                `;
            nock(url.href)
                .get('/')
                .reply(200, html, {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://first.webmention.endpoint/');
        });

        it('Ignores link without href', async function () {
            const url = new URL('http://testpage.com/');
            const html = `
                    <link rel="webmention" />
                `;
            nock(url.href)
                .get('/')
                .reply(200, html, {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert.equal(endpoint, null);
        });

        it('Returns first endpoint for valid html site with multiple <link> and <a> tags', async function () {
            // note - link tags are in the header and should come first
            const url = new URL('http://testpage.com/');
            const html = `
                    <link rel="bookmark" href="http://not.an.endpoint" />
                    <link rel="webmention" href="http://first.link.endpoint" />
                    <link rel="webmention" href="http://second.link.endpoint" />
                    <a rel="bookmark" href="http://not.an.endpoint">kewl link 1</a>
                    <a rel="webmention" href="http://first.a.endpoint">kewl link 2</a>
                `;
            nock(url.href)
                .get('/')
                .reply(200, html, {'content-type': 'text/html'});

            const endpoint = await service.getEndpoint(url);

            assert(endpoint instanceof URL);
            assert.equal(endpoint.href, 'http://first.link.endpoint/');
        });

        it('Returns null for a valid html site with no endpoint', async function () {
            const url = new URL('http://www.veryrealsite.com');
            nock(url.href)
                .get('/')
                .reply(200, {}, {'content-type': 'text/html'});
            const endpoint = await service.getEndpoint(url);

            assert.equal(endpoint, null);
        });
    });
});
