const nock = require('nock');
const sinon = require('sinon');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils/index');
const config = require('../../../core/shared/config/index');
const localUtils = require('./utils');

// for sinon stubs
const dnsPromises = require('dns').promises;

const ghost = testUtils.startGhost;

describe('Oembed API', function () {
    let ghostServer;
    let request;

    before(function () {
        return ghost()
            .then((_ghostServer) => {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            });
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    it('can fetch an embed', function (done) {
        let requestMock = nock('https://www.youtube.com')
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

        request.get(localUtils.API.getApiQuery('oembed/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE5yFcdPAGv0'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                requestMock.isDone().should.be.true();
                should.exist(res.body.html);
                done();
            });
    });

    describe('type: bookmark', function () {
        it('can fetch a bookmark with ?type=bookmark', function (done) {
            const pageMock = nock('https://example.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('https://example.com');
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}&type=bookmark`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    res.body.type.should.eql('bookmark');
                    res.body.url.should.eql('https://example.com');
                    res.body.metadata.title.should.eql('TESTING');
                    done();
                });
        });

        it('falls back to bookmark without ?type=embed and no oembed metatag', function (done) {
            const pageMock = nock('https://example.com')
                .get('/')
                .times(2) // 1st = oembed metatag check, 2nd = metascraper
                .reply(
                    200,
                    '<html><head><title>TESTING</title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('https://example.com');
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    res.body.type.should.eql('bookmark');
                    res.body.url.should.eql('https://example.com');
                    res.body.metadata.title.should.eql('TESTING');
                    done();
                });
        });

        it('errors with useful message when title is unavailable', function (done) {
            const pageMock = nock('https://example.com')
                .get('/')
                .reply(
                    200,
                    '<html><head><title></title></head><body></body></html>',
                    {'content-type': 'text/html'}
                );

            const url = encodeURIComponent('https://example.com');
            request.get(localUtils.API.getApiQuery(`oembed/?type=bookmark&url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    should.exist(res.body.errors);
                    res.body.errors[0].context.should.match(/insufficient metadata/i);
                    done();
                });
        });
    });

    describe('with unknown provider', function () {
        it('fetches url and follows redirects', function (done) {
            const redirectMock = nock('http://test.com/')
                .get('/')
                .reply(302, undefined, {Location: 'http://oembed.test.com'});

            const pageMock = nock('http://oembed.test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://oembed.test.com/my-embed"></head></html>');

            const oembedMock = nock('http://oembed.test.com')
                .get('/my-embed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com/');
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    redirectMock.isDone().should.be.true();
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('fetches url and follows <link rel="alternate">', function (done) {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

            const oembedMock = nock('http://test.com')
                .get('/oembed')
                .reply(200, {
                    version: '1.0',
                    type: 'link'
                });

            const url = encodeURIComponent('http://test.com');
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('follows redirects when fetching <link rel="alternate">', function (done) {
            const pageMock = nock('http://test.com')
                .get('/')
                .reply(200, '<html><head><link rel="alternate" type="application/json+oembed" href="http://test.com/oembed"></head></html>');

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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    alternateRedirectMock.isDone().should.be.true();
                    alternateMock.isDone().should.be.true();
                    done();
                });
        });

        it('rejects invalid oembed responses', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('rejects unknown oembed types', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('rejects invalid photo responses', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('rejects invalid video responses', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
                    done();
                });
        });

        it('strips unknown response fields', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
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

                    done();
                });
        });

        it('skips fetching IPv4 addresses', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });

        it('skips fetching IPv6 addresses', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });

        it('skips fetching localhost', function (done) {
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });

        it('skips fetching url that resolves to private IP', function (done) {
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'page.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                }
                return dnsPromises.lookup.wrappedMethod.apply(this, arguments);
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.false();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });

        it('aborts fetching if a redirect resolves to private IP', function (done) {
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'page.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                }
                return dnsPromises.lookup.wrappedMethod.apply(this, arguments);
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    redirectMock.isDone().should.be.true();
                    pageMock.isDone().should.be.false();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });

        it('skips fetching <link rel="alternate"> if it resolves to a private IP', function (done) {
            sinon.stub(dnsPromises, 'lookup').callsFake(function (hostname) {
                if (hostname === 'oembed.com') {
                    return Promise.resolve({address: '192.168.0.1'});
                }
                return dnsPromises.lookup.wrappedMethod.apply(this, arguments);
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
            request.get(localUtils.API.getApiQuery(`oembed/?url=${url}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.false();
                    done();
                });
        });
    });
});
