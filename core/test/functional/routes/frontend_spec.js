// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request = require('supertest'),
    should = require('should'),
    sinon = require('sinon'),
    moment = require('moment'),
    cheerio = require('cheerio'),
    testUtils = require('../../utils'),
    config = require('../../../../core/server/config'),
    ghost = require('../../../../core'),
    sandbox = sinon.sandbox.create();

describe('Frontend Routing', function () {
    var scope = {
        stopGhostServer: function (done) {
            scope.ghostServer.stop()
                .then(function () {
                    done();
                })
                .catch(done);
        },
        startGhostServer: function (done) {
            ghost().then(function (ghostServer) {
                scope.ghostServer = ghostServer;

                // Setup the request object with the ghost express app
                scope.request = request(ghostServer.rootApp);

                ghostServer.start()
                    .then(function () {
                        done();
                    })
                    .catch(done);
            }).catch(done);
        },
        restartGhostServer: function (done) {
            scope.stopGhostServer(function (err) {
                if (err) {
                    return done(err);
                }

                scope.startGhostServer(done);
            });
        }
    };

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
        testUtils.fixtures.insertPosts()
            .then(function () {
                done();
            })
            .catch(function (err) {
                console.log(err);
                done(err);
            });
    }

    before(testUtils.teardown);

    before(function (done) {
        scope.startGhostServer(done);
    });

    after(function (done) {
        scope.stopGhostServer(done);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Test with Initial Fixtures', function () {
        describe('Error', function () {
            it('should 404 for unknown post', function (done) {
                scope.request.get('/spectacular/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for unknown post with invalid characters', function (done) {
                scope.request.get('/$pec+acular~/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for unknown frontend route', function (done) {
                scope.request.get('/spectacular/marvellous/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for encoded char not 301 from uncapitalise', function (done) {
                scope.request.get('/|/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 for unknown file', function (done) {
                scope.request.get('/content/images/some/file/that/doesnt-exist.jpg')
                    .expect('Cache-Control', testUtils.cacheRules['private'])
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Single post', function () {
            it('should redirect without slash', function (done) {
                scope.request.get('/welcome-to-ghost')
                    .expect('Location', '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect uppercase', function (done) {
                scope.request.get('/Welcome-To-Ghost/')
                    .expect('Location', '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html for valid url', function (done) {
                scope.request.get('/welcome-to-ghost/')
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
                        $('body.post-template').length.should.equal(1);
                        $('body.tag-getting-started').length.should.equal(1);
                        $('article.post').length.should.equal(1);
                        $('article.tag-getting-started').length.should.equal(1);

                        done();
                    });
            });

            it('should not work with date permalinks', function (done) {
                // get today's date
                var date = moment().format('YYYY/MM/DD');

                scope.request.get('/' + date + '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Post edit', function () {
            it('should redirect without slash', function (done) {
                scope.request.get('/welcome-to-ghost/edit')
                    .expect('Location', '/welcome-to-ghost/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect to editor', function (done) {
                scope.request.get('/welcome-to-ghost/edit/')
                    .expect('Location', '/ghost/editor/1/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302)
                    .end(doEnd(done));
            });

            it('should 404 for non-edit parameter', function (done) {
                scope.request.get('/welcome-to-ghost/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Static assets', function () {
            it('should retrieve theme assets', function (done) {
                scope.request.get('/assets/css/screen.css')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should retrieve built assets', function (done) {
                scope.request.get('/ghost/vendor.js')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should retrieve default robots.txt', function (done) {
                scope.request.get('/robots.txt')
                    .expect('Cache-Control', testUtils.cacheRules.hour)
                    .expect('ETag', /[0-9a-f]{32}/i)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should retrieve default favicon.ico', function (done) {
                scope.request.get('/favicon.ico')
                    .expect('Cache-Control', testUtils.cacheRules.day)
                    .expect('ETag', /[0-9a-f]{32}/i)
                    .expect(200)
                    .end(doEnd(done));
            });

            // at the moment there is no image fixture to test
            // it('should retrieve image assets', function (done) {
            // scope.request.get('/content/images/some.jpg')
            //    .expect('Cache-Control', testUtils.cacheRules.year)
            //    .end(doEnd(done));
            // });
        });
    });

    describe('Static page', function () {
        before(testUtils.teardown);
        before(testUtils.setup());
        before(addPosts);

        it('should redirect without slash', function (done) {
            scope.request.get('/static-page-test')
                .expect('Location', '/static-page-test/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            scope.request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Post preview', function () {
        before(testUtils.teardown);
        before(testUtils.setup());
        before(addPosts);

        it('should display draft posts accessed via uuid', function (done) {
            scope.request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
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
                    $('.content .post').length.should.equal(1);
                    $('.poweredby').text().should.equal('Proudly published with Ghost');
                    $('body.post-template').length.should.equal(1);
                    $('article.post').length.should.equal(1);

                    done();
                });
        });

        it('should redirect published posts to their live url', function (done) {
            scope.request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
                .expect(301)
                .expect('Location', '/short-and-sweet/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .end(doEnd(done));
        });

        it('404s unknown uuids', function (done) {
            scope.request.get('/p/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
                .expect(404)
                .end(doEnd(done));
        });
    });

    describe('Post with Ghost in the url', function () {
        before(testUtils.teardown);
        before(testUtils.setup());
        before(addPosts);

        // All of Ghost's admin depends on the /ghost/ in the url to work properly
        // Badly formed regexs can cause breakage if a post slug starts with the 5 letters ghost
        it('should retrieve a blog post with ghost at the start of the url', function (done) {
            scope.request.get('/ghostly-kitchen-sink/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Subdirectory (no slash)', function () {
        before(testUtils.teardown);

        before(function (done) {
            var originalLoad = config.load;

            sandbox.stub(config, 'load', function (configPath) {
                return originalLoad.bind(this)(configPath)
                    .then(function () {
                        config.set({url: 'http://localhost/blog'});
                    });
            });

            scope.restartGhostServer(done);
        });

        it('http://localhost should 404', function (done) {
            scope.request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/ should 404', function (done) {
            scope.request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/blog should 301 to  http://localhost/blog/', function (done) {
            scope.request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('http://localhost/blog/ should 200', function (done) {
            scope.request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome-to-ghost should 301 to http://localhost/blog/welcome-to-ghost/', function (done) {
            scope.request.get('/blog/welcome-to-ghost')
                .expect(301)
                .expect('Location', '/blog/welcome-to-ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome-to-ghost/ should 200', function (done) {
            scope.request.get('/blog/welcome-to-ghost/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started should 301 to /blog/tag/getting-started/', function (done) {
            scope.request.get('/blog/tag/getting-started')
                .expect(301)
                .expect('Location', '/blog/tag/getting-started/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started/ should 200', function (done) {
            scope.request.get('/blog/tag/getting-started/')
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Subdirectory (with slash)', function () {
        before(testUtils.teardown);

        before(function (done) {
            var originalLoad = config.load;

            sandbox.stub(config, 'load', function (configPath) {
                return originalLoad.bind(this)(configPath)
                    .then(function () {
                        config.set({url: 'http://localhost/blog/'});
                    });
            });

            scope.restartGhostServer(done);
        });

        it('http://localhost should 404', function (done) {
            scope.request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('http://localhost/ should 404', function (done) {
            scope.request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('/blog should 301 to /blog/', function (done) {
            scope.request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('/blog/ should 200', function (done) {
            scope.request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome-to-ghost should 301 to /blog/welcome-to-ghost/', function (done) {
            scope.request.get('/blog/welcome-to-ghost')
                .expect(301)
                .expect('Location', '/blog/welcome-to-ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/welcome-to-ghost/ should 200', function (done) {
            scope.request.get('/blog/welcome-to-ghost/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started should 301 to /blog/tag/getting-started/', function (done) {
            scope.request.get('/blog/tag/getting-started')
                .expect(301)
                .expect('Location', '/blog/tag/getting-started/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started/ should 200', function (done) {
            scope.request.get('/blog/tag/getting-started/')
                .expect(200)
                .end(doEnd(done));
        });

        it('should uncapitalise correctly with 301 to subdir', function (done) {
            scope.request.get('/blog/AAA/')
                .expect('Location', '/blog/aaa/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    // @TODO: this test is wrong designed?
    describe.skip('HTTPS', function () {
        before(testUtils.teardown);

        before(function (done) {
            var originalLoad = config.load;

            sandbox.stub(config, 'load', function (configPath) {
                return originalLoad.bind(this)(configPath)
                    .then(function () {
                        config.set({url: 'https://localhost'});
                    });
            });

            scope.restartGhostServer(done);
        });

        it('should set links to url over non-HTTPS', function (done) {
            scope.request.get('/')
                .expect(200)
                .expect(/<link rel="canonical" href="http:/)
                .expect(/<a href="http:/)
                .end(doEnd(done));
        });

        it('should set links to urlSSL over HTTPS besides canonical', function (done) {
            scope.request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/<link rel="canonical" href="http:/)
                .expect(/<a href="https:/)
                .end(doEnd(done));
        });
    });

    describe('Date permalinks', function () {
        before(testUtils.teardown);

        before(function (done) {
            scope.restartGhostServer(done);
        });

        before(function (done) {
            // Only way to swap permalinks setting is to login and visit the URL because
            // poking the database doesn't work as settings are cached
            testUtils.togglePermalinks(scope.request, 'date')
                .then(function () {
                    done();
                });
        });

        it('should load a post with date permalink', function (done) {
            var date = moment().format('YYYY/MM/DD');

            scope.request.get('/' + date + '/welcome-to-ghost/')
                .expect(200)
                .expect('Content-Type', /html/)
                .end(doEnd(done));
        });

        it('expect redirect because of wrong/old permalink prefix', function (done) {
            var date = moment().format('YYYY/MM/DD');

            scope.request.get('/2016/04/01/welcome-to-ghost/')
                .expect('Content-Type', /html/)
                .end(function (err, res) {
                    res.status.should.eql(301);

                    scope.request.get('/' + date + '/welcome-to-ghost/')
                        .expect(200)
                        .expect('Content-Type', /html/)
                        .end(doEnd(done));
                });
        });

        it('should serve RSS with date permalink', function (done) {
            scope.request.get('/rss/')
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
                        postLink = '/' + yyyy + '/' + mm + '/' + dd + '/welcome-to-ghost/';

                    content.indexOf(postLink).should.be.above(0);
                    done();
                });
        });
    });

    describe('Site Map', function () {
        before(testUtils.teardown);

        before(function (done) {
            testUtils.initData().then(function () {
                return testUtils.fixtures.insertPostsAndTags();
            }).then(function () {
                done();
            }).catch(done);
        });

        it('should serve sitemap.xml', function (done) {
            scope.request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        it('should serve sitemap-posts.xml', function (done) {
            scope.request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        it('should serve sitemap-pages.xml', function (done) {
            scope.request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        // TODO: Other pages and verify content
    });
});
