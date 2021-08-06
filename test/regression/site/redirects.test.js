// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');

const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const config = require('../../../core/shared/config');
const ghost = testUtils.startGhost;
let request;

describe('Frontend Routing:Redirects', function () {
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.not.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    function addPosts(done) {
        testUtils.clearData().then(function () {
            return testUtils.initData();
        }).then(function () {
            return testUtils.fixtures.insertPostsAndTags();
        }).then(function () {
            done();
        });
    }

    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            });
    });

    // TODO: convert to unit tests
    const redirectsFileExts = ['.json', '.yaml'];

    redirectsFileExts.forEach((ext) => {
        describe(`Redirects (use redirects${ext} from test/utils/fixtures/data)`, function () {
            let ghostServer;

            before(function () {
                configUtils.set('url', 'http://localhost:2370/');
                urlUtils.stubUrlUtilsFromConfig();

                return ghost({forceStart: true, redirectsFileExt: ext})
                    .then(function (_ghostServer) {
                        ghostServer = _ghostServer;
                        request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                    });
            });

            after(function () {
                configUtils.restore();
                urlUtils.restore();
            });

            describe('1 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/post/10/a-nice-blog-post')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/a-nice-blog-post');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/post/10/a-nice-blog-post/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/a-nice-blog-post');
                            doEnd(done)(err, res);
                        });
                });

                it('with query params', function (done) {
                    request.get('/topic?something=good')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/?something=good');
                            doEnd(done)(err, res);
                        });
                });

                it('with query params', function (done) {
                    request.get('/post/10/a-nice-blog-post?a=b')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/a-nice-blog-post?a=b');
                            doEnd(done)(err, res);
                        });
                });

                it('with case insensitive', function (done) {
                    request.get('/CaSe-InSeNsItIvE')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/redirected-insensitive');
                            doEnd(done)(err, res);
                        });
                });

                it('with case sensitive', function (done) {
                    request.get('/Case-Sensitive')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/redirected-sensitive');
                            doEnd(done)(err, res);
                        });
                });

                it('defaults to case sensitive', function (done) {
                    request.get('/Default-Sensitive')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/redirected-default');
                            doEnd(done)(err, res);
                        });
                });

                it('should not redirect with case sensitive', function (done) {
                    request.get('/casE-sensitivE')
                        .end(function (err, res) {
                            res.headers.location.should.not.eql('/redirected-sensitive');
                            res.statusCode.should.not.eql(302);
                            doEnd(done)(err, res);
                        });
                });

                it('should not redirect with default case sensitive', function (done) {
                    request.get('/defaulT-sensitivE')
                        .end(function (err, res) {
                            res.headers.location.should.not.eql('/redirected-default');
                            res.statusCode.should.not.eql(302);
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('2 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/my-old-blog-post/')
                        .expect(301)
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/revamped-url/');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/my-old-blog-post')
                        .expect(301)
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/revamped-url/');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('3 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/what/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/what-does-god-say');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/what')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/what-does-god-say');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('4 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/search/label/&&&/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/tag/&&&/');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/search/label/&&&/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/tag/&&&/');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('5 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/topic/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/topic')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('6 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/resources/download/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/shubal-stearns');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/resources/download')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/shubal-stearns');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('7 case', function () {
                it('with trailing slash', function (done) {
                    request.get('/2016/11/welcome.html')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/welcome');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('last case', function () {
                it('default', function (done) {
                    request.get('/prefix/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/blog/');
                            doEnd(done)(err, res);
                        });
                });

                it('with a custom path', function (done) {
                    request.get('/prefix/expect-redirect')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/blog/expect-redirect');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('external url redirect', function () {
                it('with trailing slash', function (done) {
                    request.get('/external-url/')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('https://ghost.org/');
                            doEnd(done)(err, res);
                        });
                });

                it('without trailing slash', function (done) {
                    request.get('/external-url')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('https://ghost.org/');
                            doEnd(done)(err, res);
                        });
                });

                it('with capturing group', function (done) {
                    request.get('/external-url/docs')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('https://ghost.org/docs');
                            doEnd(done)(err, res);
                        });
                });
            });
        });

        describe(`Subdirectory redirects (use redirects${ext} from test/utils/fixtures/data)`, function () {
            var ghostServer;

            before(function () {
                configUtils.set('url', 'http://localhost:2370/blog/');
                urlUtils.stubUrlUtilsFromConfig();

                return ghost({forceStart: true, subdir: true, redirectsFileExt: ext})
                    .then(function (_ghostServer) {
                        ghostServer = _ghostServer;
                        request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                    });
            });

            after(function () {
                configUtils.restore();
                urlUtils.restore();
            });

            describe('internal url redirect', function () {
                it('should include the subdirectory', function (done) {
                    request.get('/blog/my-old-blog-post/')
                        .expect(301)
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/blog/revamped-url/');
                            doEnd(done)(err, res);
                        });
                });
                it('should work with regex "from" redirects', function (done) {
                    request.get('/blog/capture1/whatever')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('/blog/whatever');
                            doEnd(done)(err, res);
                        });
                });
            });

            describe('external url redirect', function () {
                it('should not include the subdirectory', function (done) {
                    request.get('/blog/external-url/docs')
                        .expect(302)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .end(function (err, res) {
                            res.headers.location.should.eql('https://ghost.org/docs');
                            doEnd(done)(err, res);
                        });
                });
            });
        });
    });
});
