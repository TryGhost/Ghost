// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
var should = require('should'),
    sinon = require('sinon'),
    supertest = require('supertest'),
    moment = require('moment'),
    cheerio = require('cheerio'),
    _ = require('lodash'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    config = require('../../../server/config'),
    settingsCache = require('../../../server/services/settings/cache'),
    origCache = _.cloneDeep(settingsCache),
    ghost = testUtils.startGhost,
    request,

    sandbox = sinon.sandbox.create();

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
        sandbox.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            });
    });

    describe('Date permalinks', function () {
        before(function (done) {
            // Only way to swap permalinks setting is to login and visit the URL because
            // poking the database doesn't work as settings are cached
            testUtils.togglePermalinks(request, 'date')
                .then(function () {
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            testUtils.togglePermalinks(request)
                .then(function () {
                    done();
                })
                .catch(done);
        });

        it('should load a post with date permalink', function (done) {
            var date = moment().format('YYYY/MM/DD');

            request.get('/' + date + '/welcome/')
                .expect(200)
                .expect('Content-Type', /html/)
                .end(doEnd(done));
        });

        it('expect redirect because of wrong/old permalink prefix', function (done) {
            var date = moment().format('YYYY/MM/DD');

            request.get('/2016/04/01/welcome/')
                .expect(301)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    request.get('/' + date + '/welcome/')
                        .expect(200)
                        .expect('Content-Type', /html/)
                        .end(doEnd(done));
                });
        });

        it('should serve RSS with date permalink', function (done) {
            request.get('/rss/')
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.not.exist(res.headers['X-CSRF-Token']);
                    should.not.exist(res.headers['set-cookie']);
                    should.exist(res.headers.date);

                    var content = res.text,
                        todayMoment = moment(),
                        dd = todayMoment.format('DD'),
                        mm = todayMoment.format('MM'),
                        yyyy = todayMoment.format('YYYY'),
                        postLink = '/' + yyyy + '/' + mm + '/' + dd + '/welcome/';

                    content.indexOf(postLink).should.be.above(0);
                    done();
                });
        });
    });

    describe('Test with Initial Fixtures', function () {
        describe('Error', function () {
            it('should 404 for unknown post', function (done) {
                request.get('/spectacular/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

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

            it('should 404 for unknown file', function (done) {
                request.get('/content/images/some/file/that/doesnt-exist.jpg')
                    .expect('Cache-Control', testUtils.cacheRules['private'])
                    .expect(404)
                    .expect(/404 Image not found/)
                    .end(doEnd(done));
            });
        });

        describe('Single post', function () {
            it('should redirect without slash', function (done) {
                request.get('/welcome')
                    .expect('Location', '/welcome/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect uppercase', function (done) {
                request.get('/Welcome/')
                    .expect('Location', '/welcome/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should sanitize double slashes when redirecting uppercase', function (done) {
                request.get('///Google.com/')
                    .expect('Location', '/google.com/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html for valid url', function (done) {
                request.get('/welcome/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var $ = cheerio.load(res.text);

                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.not.exist(res.headers['X-CSRF-Token']);
                        should.not.exist(res.headers['set-cookie']);
                        should.exist(res.headers.date);

                        $('title').text().should.equal('Welcome to Ghost');

                        // @TODO: change or remove?
                        // $('.content .post').length.should.equal(1);
                        // $('.poweredby').text().should.equal('Proudly published with Ghost');
                        // $('body.post-template').length.should.equal(1);
                        // $('body.tag-getting-started').length.should.equal(1);
                        // $('article.post').length.should.equal(1);
                        // $('article.tag-getting-started').length.should.equal(1);

                        done();
                    });
            });

            it('should not work with date permalinks', function (done) {
                // get today's date
                var date = moment().format('YYYY/MM/DD');

                request.get('/' + date + '/welcome/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Post edit', function () {
            it('should redirect without slash', function (done) {
                request.get('/welcome/edit')
                    .expect('Location', '/welcome/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect to editor', function (done) {
                request.get('/welcome/edit/')
                    .expect('Location', /ghost\/#\/editor\/\w+/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302)
                    .end(doEnd(done));
            });

            it('should 404 for non-edit parameter', function (done) {
                request.get('/welcome/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('AMP post', function () {
            it('should redirect without slash', function (done) {
                request.get('/welcome/amp')
                    .expect('Location', '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect uppercase', function (done) {
                request.get('/Welcome/AMP/')
                    .expect('Location', '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html for valid url', function (done) {
                request.get('/welcome/amp/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var $ = cheerio.load(res.text);

                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.not.exist(res.headers['X-CSRF-Token']);
                        should.not.exist(res.headers['set-cookie']);
                        should.exist(res.headers.date);

                        $('title').text().should.equal('Welcome to Ghost');
                        $('.content .post').length.should.equal(1);
                        $('.poweredby').text().should.equal('Proudly published with Ghost');
                        $('body.amp-template').length.should.equal(1);
                        $('article.post').length.should.equal(1);

                        done();
                    });
            });

            it('should not work with date permalinks', function (done) {
                // get today's date
                var date = moment().format('YYYY/MM/DD');

                request.get('/' + date + '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should not render AMP, when AMP is disabled', function (done) {
                sandbox.stub(settingsCache, 'get').callsFake(function (key, options) {
                    if (key === 'amp' && !options) {
                        return false;
                    }
                    return origCache.get(key, options);
                });

                request.get('/welcome/amp/')
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Static assets', function () {
            it('should retrieve theme assets', function (done) {
                request.get('/assets/css/screen.css')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should retrieve default robots.txt', function (done) {
                request.get('/robots.txt')
                    .expect('Cache-Control', testUtils.cacheRules.hour)
                    .expect('ETag', /[0-9a-f]{32}/i)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should retrieve default favicon.ico', function (done) {
                request.get('/favicon.ico')
                    .expect('Cache-Control', testUtils.cacheRules.day)
                    .expect('ETag', /[0-9a-f]{32}/i)
                    .expect(200)
                    .end(doEnd(done));
            });

            // at the moment there is no image fixture to test
            // it('should retrieve image assets', function (done) {
            // request.get('/content/images/some.jpg')
            //    .expect('Cache-Control', testUtils.cacheRules.year)
            //    .end(doEnd(done));
            // });
        });
    });

    describe('Static page', function () {
        before(addPosts);

        it('should redirect without slash', function (done) {
            request.get('/static-page-test')
                .expect('Location', '/static-page-test/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
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

        describe('amp', function () {
            it('should 404 for amp parameter', function (done) {
                request.get('/static-page-test/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });
    });

    describe('Post preview', function () {
        before(addPosts);

        it('should display draft posts accessed via uuid', function (done) {
            request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var $ = cheerio.load(res.text);

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
        before(addPosts);

        // All of Ghost's admin depends on the /ghost/ in the url to work properly
        // Badly formed regexs can cause breakage if a post slug starts with the 5 letters ghost
        it('should retrieve a blog post with ghost at the start of the url', function (done) {
            request.get('/ghostly-kitchen-sink/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Site Map', function () {
        before(function (done) {
            testUtils.clearData().then(function () {
                return testUtils.initData();
            }).then(function () {
                return testUtils.fixtures.insertPostsAndTags();
            }).then(function () {
                done();
            }).catch(done);
        });

        it('should serve sitemap.xml', function (done) {
            request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/sitemapindex/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-posts.xml', function (done) {
            request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-pages.xml', function (done) {
            request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });
        // TODO: Other pages and verify content
    });

    describe('Subdirectory (no slash)', function () {
        var ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost/blog');

            return ghost({forceStart: true, subdir: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;

                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
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
        var ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost/blog/');

            return ghost({forceStart: true, subdir: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
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
        var ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/');

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
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

    describe('Redirects (use redirects.json from test/utils/fixtures/data)', function () {
        var ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/');

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
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

            it('should not redirect', function (done) {
                request.get('/post/a-nice-blog-post/')
                    .end(function (err, res) {
                        res.statusCode.should.not.eql(302);
                        res.statusCode.should.not.eql(301);
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

            it('should not redirect', function (done) {
                request.get('/my-old-blog-post-1/')
                    .end(function (err, res) {
                        res.statusCode.should.not.eql(302);
                        res.statusCode.should.not.eql(301);
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
    });
});
