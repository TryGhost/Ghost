// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');

const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const cheerio = require('cheerio');
const _ = require('lodash');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const config = require('../../../core/shared/config');
const settingsCache = require('../../../core/server/services/settings/cache');
const origCache = _.cloneDeep(settingsCache);
const ghost = testUtils.startGhost;
let request;

describe('Frontend Routing', function () {
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

    describe('Test with Initial Fixtures', function () {
        describe('Error', function () {
            it('should 404 for unknown post with invalid characters', function (done) {
                request.get('/$pec+acular~/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for unknown frontend route', function (done) {
                request.get('/spectacular/marvellous/')
                    .set('Accept', 'application/json')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for encoded char not 301 from uncapitalise', function (done) {
                request.get('/|/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Default Redirects (clean URLS)', function () {
            it('Single post should redirect without slash', function (done) {
                request.get('/welcome')
                    .expect('Location', '/welcome/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('Single post should redirect uppercase', function (done) {
                request.get('/Welcome/')
                    .expect('Location', '/welcome/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('Single post should sanitize double slashes when redirecting uppercase', function (done) {
                request.get('///Google.com/')
                    .expect('Location', '/google.com/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('AMP post should redirect without slash', function (done) {
                request.get('/welcome/amp')
                    .expect('Location', '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('AMP post should redirect uppercase', function (done) {
                request.get('/Welcome/AMP/')
                    .expect('Location', '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });
        });
    });

    describe('Test with added posts', function () {
        before(addPosts);

        describe('Static page', function () {
            it('should respond with html', function (done) {
                request.get('/static-page-test/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(function (err, res) {
                        const $ = cheerio.load(res.text);

                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.not.exist(res.headers['X-CSRF-Token']);
                        should.not.exist(res.headers['set-cookie']);
                        should.exist(res.headers.date);

                        $('title').text().should.equal('This is a static page');
                        $('body.page-template').length.should.equal(1);
                        $('article.post').length.should.equal(1);

                        doEnd(done)(err, res);
                    });
            });

            it('should redirect without slash', function (done) {
                request.get('/static-page-test')
                    .expect('Location', '/static-page-test/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            describe('edit', function () {
                it('should redirect without slash', function (done) {
                    request.get('/static-page-test/edit')
                        .expect('Location', '/static-page-test/edit/')
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .expect(301)
                        .end(doEnd(done));
                });

                it('should redirect to editor', function (done) {
                    request.get('/static-page-test/edit/')
                        .expect('Location', /ghost\/#\/editor\/\w+/)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .expect(302)
                        .end(doEnd(done));
                });

                it('should 404 for non-edit parameter', function (done) {
                    request.get('/static-page-test/notedit/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Page not found/)
                        .end(doEnd(done));
                });
            });

            describe('edit with admin redirects disabled', function () {
                before(function (done) {
                    configUtils.set('admin:redirects', false);

                    ghost({forceStart: true})
                        .then(function () {
                            request = supertest.agent(config.get('url'));
                            addPosts(done);
                        });
                });

                after(function (done) {
                    configUtils.restore();

                    ghost({forceStart: true})
                        .then(function () {
                            request = supertest.agent(config.get('url'));
                            addPosts(done);
                        });
                });

                it('should redirect without slash', function (done) {
                    request.get('/static-page-test/edit')
                        .expect('Location', '/static-page-test/edit/')
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .expect(301)
                        .end(doEnd(done));
                });

                it('should not redirect to editor', function (done) {
                    request.get('/static-page-test/edit/')
                        .expect(404)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .end(doEnd(done));
                });
            });

            describe('amp', function () {
                it('should 404 for amp parameter', function (done) {
                    // NOTE: only post pages are supported so the router doesn't have a way to distinguish if
                    //       the request was done after AMP 'Page' or 'Post'
                    request.get('/static-page-test/amp/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Post not found/)
                        .end(doEnd(done));
                });
            });
        });

        describe('Post preview', function () {
            it('should display draft posts accessed via uuid', function (done) {
                request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
                    .expect('Content-Type', /html/)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        const $ = cheerio.load(res.text);

                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.not.exist(res.headers['X-CSRF-Token']);
                        should.not.exist(res.headers['set-cookie']);
                        should.exist(res.headers.date);

                        $('title').text().should.equal('Not finished yet');
                        // @TODO: use theme from fixtures and don't rely on content/themes/casper
                        // $('.content .post').length.should.equal(1);
                        // $('.poweredby').text().should.equal('Proudly published with Ghost');
                        // $('body.post-template').length.should.equal(1);
                        // $('article.post').length.should.equal(1);

                        done();
                    });
            });

            it('should redirect published posts to their live url', function (done) {
                request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
                    .expect(301)
                    .expect('Location', '/short-and-sweet/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .end(doEnd(done));
            });

            it('404s unknown uuids', function (done) {
                request.get('/p/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
                    .expect(404)
                    .end(doEnd(done));
            });
        });

        describe('Post with Ghost in the url', function () {
            // All of Ghost's admin depends on the /ghost/ in the url to work properly
            // Badly formed regexs can cause breakage if a post slug starts with the 5 letters ghost
            it('should retrieve a blog post with ghost at the start of the url', function (done) {
                request.get('/ghostly-kitchen-sink/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });
        });
    });

    describe('Subdirectory (no slash)', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost/blog');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true, subdir: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;

                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('http://localhost should 404', function (done) {
            request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/ should 404', function (done) {
            request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/blog should 301 to  http://localhost/blog/', function (done) {
            request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('http://localhost/blog/ should 200', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome should 301 to http://localhost/blog/welcome/', function (done) {
            request.get('/blog/welcome')
                .expect(301)
                .expect('Location', '/blog/welcome/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome/ should 200', function (done) {
            request.get('/blog/welcome/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started should 301 to /blog/tag/getting-started/', function (done) {
            request.get('/blog/tag/getting-started')
                .expect(301)
                .expect('Location', '/blog/tag/getting-started/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started/ should 200', function (done) {
            request.get('/blog/tag/getting-started/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome/amp/ should 200', function (done) {
            request.get('/blog/welcome/amp/')
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Subdirectory (with slash)', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost/blog/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true, subdir: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('http://localhost should 404', function (done) {
            request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/ should 404', function (done) {
            request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('/blog should 301 to /blog/', function (done) {
            request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('/blog/ should 200', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome should 301 to /blog/welcome/', function (done) {
            request.get('/blog/welcome')
                .expect(301)
                .expect('Location', '/blog/welcome/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/welcome/ should 200', function (done) {
            request.get('/blog/welcome/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started should 301 to /blog/tag/getting-started/', function (done) {
            request.get('/blog/tag/getting-started')
                .expect(301)
                .expect('Location', '/blog/tag/getting-started/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started/ should 200', function (done) {
            request.get('/blog/tag/getting-started/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome/amp/ should 200', function (done) {
            request.get('/blog/welcome/amp/')
                .expect(200)
                .end(doEnd(done));
        });

        it('should uncapitalise correctly with 301 to subdir', function (done) {
            request.get('/blog/AAA/')
                .expect('Location', '/blog/aaa/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('HTTPS', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('should set links to url over non-HTTPS', function (done) {
            request.get('/')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="http:\/\/localhost:2370">Ghost<\/a\>/)
                .end(doEnd(done));
        });

        it('should set links over HTTPS besides canonical', function (done) {
            request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="https:\/\/localhost:2370">Ghost<\/a\>/)
                .end(doEnd(done));
        });
    });

    // TODO: convert to unit tests
    describe('Redirects (use redirects.json from test/utils/fixtures/data)', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true})
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

    describe('Subdirectory redirects (use redirects.json from test/utils/fixtures/data)', function () {
        var ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/blog/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true, subdir: true})
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
