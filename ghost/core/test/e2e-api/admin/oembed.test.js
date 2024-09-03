const nock = require('nock');
const sinon = require('sinon');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils/index');
const config = require('../../../core/shared/config/index');
const localUtils = require('./utils');
const {mockManager} = require('../../utils/e2e-framework');
const oembed = require('../../../../core/core/server/services/oembed');

// for sinon stubs
const dnsPromises = require('dns').promises;

describe('Oembed API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    let processImageFromUrlStub;

    beforeEach(function () {
        // ensure sure we're not network dependent
        mockManager.disableNetwork();
        processImageFromUrlStub = sinon.stub(oembed, 'processImageFromUrl');
        processImageFromUrlStub.callsFake(async function (imageUrl) {
            if (imageUrl === 'http://example.com/bad-image') {
                throw new Error('Failed to process image');
            }
            return '/content/images/image-01.png';
        });
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('can fetch an embed', async function () {
        const requestMock = nock('https://www.youtube.com')
            .get('/oembed')
            .query(true)
            .reply(200, {
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
                thumbnail_width: 480,
                width: 480,
                author_url: 'https://www.youtube.com/user/gorillaz',
                height: 270,
                thumbnail_height: 360,
                provider_name: 'YouTube',
                title: 'Gorillaz - Humility (Official Video)',
                provider_url: 'https://www.youtube.com/',
                author_name: 'Gorillaz',
                version: '1.0',
                thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
                type: 'video'
            });

        const res = await request.get(localUtils.API.getApiQuery('oembed/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE5yFcdPAGv0'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        requestMock.isDone().should.be.true();
        should.exist(res.body.html);
    });

    it('does not use http preferentially to https', async function () {
        const httpMock = nock('https://odysee.com')
            .get('/$/oembed')
            .query({url: 'http://odysee.com/@BarnabasNagy:5/At-Last-(Playa):2', format: 'json'})
            .reply(200, 'The URL is invalid or is not associated with any claim.');

        const httpsMock = nock('https://odysee.com')
            .get('/$/oembed')
            .query({url: 'https://odysee.com/@BarnabasNagy:5/At-Last-(Playa):2', format: 'json'})
            .reply(200, {
                html: '<iframe></iframe>',
                type: 'rich',
                version: '1.0'
            });

        const res = await request.get(localUtils.API.getApiQuery('oembed/?url=https%3A%2F%2Fodysee.com%2F%40BarnabasNagy%3A5%2FAt-Last-%28Playa%29%3A2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        httpMock.isDone().should.be.false();
        httpsMock.isDone().should.be.true();
        should.exist(res.body.html);
    });

    it('errors with a useful message when embedding is disabled', async function () {
        const requestMock = nock('https://www.youtube.com')
            .get('/oembed')
            .query(true)
            .reply(401, {
                errors: [
                    {
                        message: 'Authorisation error, cannot read oembed.',
                        context: 'URL contains a private resource.',
                        type: 'UnauthorizedError',
                        details: null,
                        property: null,
                        help: null,
                        code: null,
                        id: 'c51228a0-921a-11ed-8abe-6babfda4d18a',
                        ghostErrorCode: null
                    }
                ]
            });

        const res = await request.get(localUtils.API.getApiQuery('oembed/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE5yFcdPAGv0'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);

        requestMock.isDone().should.be.true();
        should.exist(res.body.errors);
        res.body.errors[0].context.should.match(/URL contains a private resource/i);
    });

    describe('type: bookmark', function () {
        it('can fetch a bookmark with ?type=bookmark', async function () {
            const pageMock = nock('http://example.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent(' http://example.com\t '); // Whitespaces are to make sure urls are trimmed
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            res.body.type.should.eql('bookmark');
            res.body.url.should.eql('http://example.com');
            res.body.metadata.title.should.eql('TESTING');
        });

        it('falls back to bookmark without ?type=embed and no oembed metatag', async function () {
            const pageMock = nock('http://example.com')
                .get('/')
                .times(1) // url should not be fetched twice
                .reply(
                    200,
                    '<html><head><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('http://example.com');
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            res.body.type.should.eql('bookmark');
            res.body.url.should.eql('http://example.com');
            res.body.metadata.title.should.eql('TESTING');
        });

        it('errors with useful message when title is unavailable', async function () {
            const pageMock = nock('http://example.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><title></title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('http://example.com');
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?type=bookmark&url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            should.exist(res.body.errors);
            res.body.errors[0].context.should.match(/insufficient metadata/i);
        });

        it('errors when fetched url is an IP address', async function () {
            // in order to follow the 302, we need to stub differently; externalRequest will block the internal IP
            dnsPromises.lookup.restore();
            let dnsStub = sinon.stub(dnsPromises, 'lookup');
            dnsStub.onCall(0).returns(Promise.resolve({address: '123.123.123.123'}));
            dnsStub.onCall(1).returns(Promise.resolve({address: '0.0.0.0'}));

            nock('http://test.com/')
                .get('/')
                .reply(302, undefined, {Location: 'http://0.0.0.0:8080'});

            const pageMock = nock('http://0.0.0.0:8080')
                .get('/')
                .reply(
                    200,
                    '<html><head><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('http://test.com');
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?type=bookmark&url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.false(); // we shouldn't hit this; blocked by externalRequest
            should.exist(res.body.errors);
        });

        it('errors when fetched url is incorrect', async function () {
            const url = encodeURIComponent('example.com');
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?type=bookmark&url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            should.exist(res.body.errors);
        });

        it('should replace icon URL when it returns 404', async function () {
            // Mock the page so it contains a readable icon URL
            const pageMock = nock('http://example.com')
                .get('/page-with-icon')
                .reply(
                    200,
                    '<html><head><title>TESTING</title><link rel="icon" href="http://example.com/bad-image"></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent(' http://example.com/page-with-icon\t '); // Whitespaces are to make sure urls are trimmed
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            // Check that the icon URL mock was loaded
            pageMock.isDone().should.be.true();

            // Check that the substitute icon URL is returned in place of the original
            res.body.metadata.icon.should.eql('https://static.ghost.org/v5.0.0/images/link-icon.svg');
        });
    });

    it('should fetch and store icons', async function () {
        // Mock the page to contain a readable icon URL
        const pageMock = nock('http://example.com')
            .get('/page-with-icon')
            .reply(
                200,
                '<html><head><title>TESTING</title><link rel="icon" href="http://example.com/icon.svg"></head><body></body></html>',
                {'content-type': 'text/html'}
            );

        const url = encodeURIComponent(' http://example.com/page-with-icon\t '); // Whitespaces are to make sure urls are trimmed
        const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check that the icon URL mock was loaded
        pageMock.isDone().should.be.true();

        // Check that the substitute icon URL is returned in place of the original
        res.body.metadata.icon.should.eql('/content/images/image-01.png');
    });

    it('should fetch and store thumbnails', async function () {
        // Mock the page to contain a readable icon URL
        const pageMock = nock('http://example.com')
            .get('/page-with-thumbnail')
            .reply(
                200,
                '<html><head><title>TESTING</title><link rel="thumbnail" href="http://example.com/thumbnail.svg"></head><body></body></html>',
                {'content-type': 'text/html'}
            );

        const url = encodeURIComponent(' http://example.com/page-with-thumbnail\t '); // Whitespaces are to make sure urls are trimmed
        const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check that the thumbnail URL mock was loaded
        pageMock.isDone().should.be.true();

        // Check that the substitute thumbnail URL is returned in place of the original
        res.body.metadata.thumbnail.should.eql('/content/images/image-01.png');
    });

    describe('with unknown provider', function () {
        it('fetches url and follows redirects', async function () {
            const redirectMock = nock('http://test.com/')
                .get('/')
                .reply(302, undefined, {Location: 'http://oembed.test.com'});

            const pageMock = nock('http://oembed.test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://oembed.test.com/my-embed"><title>Title</title></head></html>');

            const oembedMock = nock('http://oembed.test.com')
                .get('/my-embed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com/');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            redirectMock.isDone().should.be.true();
            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('fetches url and follows <link rel="alternate">', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"><title>Title</title></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('follows redirects when fetching <link rel="alternate">', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"><title>Title</title></head></html>');

            const alternateRedirectMock = nock('http://test.com')
                .get('/oembed')
                .reply(301, undefined, {Location: 'http://test.com/oembed-final'});

            const alternateMock = nock('http://test.com')
                .get('/oembed-final')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            alternateRedirectMock.isDone().should.be.true();
            alternateMock.isDone().should.be.true();
        });

        it('rejects invalid oembed responses', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    html: 'test'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('rejects unknown oembed types', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'unknown'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('rejects invalid photo responses', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    // no `url` field
                    version: '1.0',
                    type: 'photo',
                    thumbnail_url: 'https://test.com/thumbnail.jpg'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('rejects invalid video responses', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    // no `html` field
                    version: '1.0',
                    type: 'video',
                    thumbnail_url: 'https://test.com/thumbnail.jpg'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();
        });

        it('strips unknown response fields', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'video',
                    html: '<p>Test</p>',
                    width: 200,
                    height: 100,
                    unknown: 'test'
                });

            const url = encodeURIComponent('http://test.com');
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.true();

            res.body.should.deepEqual({
                version: '1.0',
                type: 'video',
                html: '<p>Test</p>',
                width: 200,
                height: 100
            });
            should.not.exist(res.body.unknown);
        });

        it('skips fetching IPv4 addresses', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === '192.168.0.1') {
                    return Promise.resolve({address: '192.168.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });

            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://192.168.0.1/oembed"></head></html>');

            const oembedMock = nock('http://192.168.0.1')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.false();
        });

        it('skips fetching IPv6 addresses', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === '[2607:f0d0:1002:51::4]') {
                    return Promise.resolve({address: '192.168.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });

            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://[2607:f0d0:1002:51::4]:9999/oembed"></head></html>');

            const oembedMock = nock('http://[2607:f0d0:1002:51::4]:9999')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.false();
        });

        it('skips fetching localhost', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'localhost') {
                    return Promise.resolve({address: '127.0.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://localhost:9999/oembed"></head></html>');

            const oembedMock = nock('http://localhost:9999')
                .get('/oembed')
                .reply(200, {
                    // no `html` field
                    version: '1.0',
                    type: 'video',
                    thumbnail_url: 'https://test.com/thumbnail.jpg'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.false();
        });

        it('skips fetching url that resolves to private IP', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'page.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });

            const pageMock = nock('http://page.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://oembed.com/oembed"></head></html>');

            const oembedMock = nock('http://oembed.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://page.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.false();
            oembedMock.isDone().should.be.false();
        });

        it('aborts fetching if a redirect resolves to private IP', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(async function (hostname) {
                if (hostname === 'page.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });

            const redirectMock = nock('http://redirect.com')
                .get('/')
                .reply(301, undefined, {Location: 'http://page.com'});

            const pageMock = nock('http://page.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://oembed.com/oembed"></head></html>');

            const oembedMock = nock('http://oembed.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://redirect.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            redirectMock.isDone().should.be.true();
            pageMock.isDone().should.be.false();
            oembedMock.isDone().should.be.false();
        });

        it('skips fetching <link rel="alternate"> if it resolves to a private IP', async function () {
            dnsPromises.lookup.restore();
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'oembed.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                } else {
                    return Promise.resolve({address: '123.123.123.123'});
                }
            });

            const pageMock = nock('http://page.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://oembed.com/oembed"></head></html>');

            const oembedMock = nock('http://oembed.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://page.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.false();
        });

        it('falls back to bookmark card for WP oembeds', async function () {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/wp-json/oembed/embed?url=https%3A%2F%2Ftest.com%2F"><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const oembedMock = nock('http://test.com')
                .get('/wp-json/oembed/embed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            oembedMock.isDone().should.be.false();
        });

        it('decodes non utf-8 charsets', async function () {
            const utfString = '中国abc';
            const encodedBytes = [0xd6,0xd0,0xb9,0xfa,0x61,0x62,0x63];
            const replyBuffer = Buffer.concat([
                Buffer.from('<html><head><title>'),
                Buffer.from(encodedBytes),
                Buffer.from('</title><meta charset="gb2312"></head><body></body></html>')
            ]);

            const pageMock = nock('http://example.com')
                .get('/')
                .reply(
                    200,
                    replyBuffer,
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent(' http://example.com\t '); // Whitespaces are to make sure urls are trimmed
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            res.body.type.should.eql('bookmark');
            res.body.url.should.eql('http://example.com');
            res.body.metadata.title.should.eql(utfString);
        });

        it('does not fail on unknown charset', async function () {
            const pageMock = nock('http://example.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><title>TESTING</title><meta charset="notacharset"></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent(' http://example.com\t '); // Whitespaces are to make sure urls are trimmed
            const res = await request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            pageMock.isDone().should.be.true();
            res.body.type.should.eql('bookmark');
            res.body.url.should.eql('http://example.com');
            res.body.metadata.title.should.eql('TESTING');
        });
    });
});
