const nock = require('nock');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils/index');
const config = require('../../../../../core/shared/config/index');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Oembed API (v2)', function () {
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

    describe('with unknown provider', function () {
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
                    pageMock.isDone().should.be.true();
                    oembedMock.isDone().should.be.true();
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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

            const url = encodeURIComponent('http://test.com/');
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
