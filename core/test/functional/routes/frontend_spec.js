
// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request    = require('supertest'),
    should     = require('should'),
    moment     = require('moment'),
    cheerio    = require('cheerio'),

    testUtils  = require('../../utils'),
    ghost      = require('../../../../core');

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
        testUtils.initData().then(function () {
            return testUtils.fixtures.insertPostsAndTags();
        }).then(function () {
            done();
        });
    }

    before(function (done) {
        ghost().then(function (ghostServer) {
            // Setup the request object with the ghost express app
            request = request(ghostServer.rootApp);

            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
            done(e);
        });
    });

    after(testUtils.teardown);

    describe('Test with Initial Fixtures', function () {
        after(testUtils.teardown);

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
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Single post', function () {
            it('should redirect without slash', function (done) {
                request.get('/welcome-to-ghost')
                    .expect('Location', '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect uppercase', function (done) {
                request.get('/Welcome-To-Ghost/')
                    .expect('Location', '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html for valid url', function (done) {
                request.get('/welcome-to-ghost/')
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
                var date  = moment().format('YYYY/MM/DD');

                request.get('/' + date + '/welcome-to-ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Post edit', function () {
            it('should redirect without slash', function (done) {
                request.get('/welcome-to-ghost/edit')
                    .expect('Location', '/welcome-to-ghost/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect to editor', function (done) {
                request.get('/welcome-to-ghost/edit/')
                    .expect('Location', '/ghost/editor/1/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302)
                    .end(doEnd(done));
            });

            it('should 404 for non-edit parameter', function (done) {
                request.get('/welcome-to-ghost/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
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

            it('should retrieve built assets', function (done) {
                request.get('/ghost/vendor.js')
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

        after(testUtils.teardown);

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
    });

    describe('Post preview', function () {
        before(addPosts);

        after(testUtils.teardown);

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
                    $('.content .post').length.should.equal(1);
                    $('.poweredby').text().should.equal('Proudly published with Ghost');
                    $('body.post-template').length.should.equal(1);
                    $('article.post').length.should.equal(1);

                    done();
                });
        });

        it('should redirect published posts to their live url', function (done) {
            request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
                .expect(301)
                .expect('Location', '/short-and-sweet/')
                .expect('Cache-Control', testUtils.cacheRules.public)
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

        after(testUtils.teardown);

        // All of Ghost's admin depends on the /ghost/ in the url to work properly
        // Badly formed regexs can cause breakage if a post slug starts with the 5 letters ghost
        it('should retrieve a blog post with ghost at the start of the url', function (done) {
            request.get('/ghostly-kitchen-sink/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Subdirectory (no slash)', function () {
        var forkedGhost, request;
        before(function (done) {
            var configTest = testUtils.fork.config();
            configTest.url = 'http://localhost/blog';

            testUtils.fork.ghost(configTest, 'testsubdir')
                .then(function (child) {
                    forkedGhost = child;
                    request = require('supertest');
                    request = request('http://localhost:' + child.port);
                }).then(done).catch(done);
        });

        after(function (done) {
            if (forkedGhost) {
                forkedGhost.kill(done);
            } else {
                done(new Error('No forked ghost process exists, test setup must have failed.'));
            }
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

        it('http://localhost/blog should 303 to  http://localhost/blog/', function (done) {
            request.get('/blog')
                .expect(303)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('http://localhost/blog/ should 200', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome-to-ghost should 301 to http://localhost/blog/welcome-to-ghost/', function (done) {
            request.get('/blog/welcome-to-ghost')
                .expect(301)
                .expect('Location', '/blog/welcome-to-ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('http://localhost/blog/welcome-to-ghost/ should 200', function (done) {
            request.get('/blog/welcome-to-ghost/')
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
    });

    describe('Subdirectory (with slash)', function () {
        var forkedGhost, request;

        before(function (done) {
            var configTest = testUtils.fork.config();
            configTest.url = 'http://localhost/blog/';

            testUtils.fork.ghost(configTest, 'testsubdir')
                .then(function (child) {
                    forkedGhost = child;
                    request = require('supertest');
                    request = request('http://localhost:' + child.port);
                }).then(done).catch(done);
        });

        after(function (done) {
            if (forkedGhost) {
                forkedGhost.kill(done);
            } else {
                done(new Error('No forked ghost process exists, test setup must have failed.'));
            }
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

        it('/blog should 303 to /blog/', function (done) {
            request.get('/blog')
                .expect(303)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('/blog/ should 200', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome-to-ghost should 301 to /blog/welcome-to-ghost/', function (done) {
            request.get('/blog/welcome-to-ghost')
                .expect(301)
                .expect('Location', '/blog/welcome-to-ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .end(doEnd(done));
        });

        it('/blog/welcome-to-ghost/ should 200', function (done) {
            request.get('/blog/welcome-to-ghost/')
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
        var forkedGhost, request;

        before(function (done) {
            var configTestHttps = testUtils.fork.config();
            configTestHttps.forceAdminSSL = {redirect: false};
            configTestHttps.urlSSL = 'https://localhost/';

            testUtils.fork.ghost(configTestHttps, 'testhttps')
                .then(function (child) {
                    forkedGhost = child;
                    request = require('supertest');
                    request = request(configTestHttps.url.replace(/\/$/, ''));
                }).then(done).catch(done);
        });

        after(function (done) {
            if (forkedGhost) {
                forkedGhost.kill(done);
            } else {
                done(new Error('No forked ghost process exists, test setup must have failed.'));
            }
        });

        it('should set links to url over non-HTTPS', function (done) {
            request.get('/')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/127.0.0.1:2370\/" \/\>/)
                .expect(/<a href="http:\/\/127.0.0.1:2370">Ghost<\/a\>/)
                .end(doEnd(done));
        });

        it('should set links to urlSSL over HTTPS besides canonical', function (done) {
            request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/127.0.0.1:2370\/" \/\>/)
                .expect(/<a href="https:\/\/localhost">Ghost<\/a\>/)
                .end(doEnd(done));
        });
    });

    describe('Date permalinks', function () {
        before(function (done) {
            // Only way to swap permalinks setting is to login and visit the URL because
            // poking the database doesn't work as settings are cached
            testUtils.togglePermalinks(request, 'date').then(function () {
                done();
            });
        });

        it('should load a post with date permalink', function (done) {
            var date  = moment().format('YYYY/MM/DD');

            request.get('/' + date + '/welcome-to-ghost/')
                .expect(200)
                .expect('Content-Type', /html/)
                .end(doEnd(done));
        });

        it('expect redirect because of wrong/old permalink prefix', function (done) {
            var date  = moment().format('YYYY/MM/DD');

            request.get('/2016/04/01/welcome-to-ghost/')
                .expect('Content-Type', /html/)
                .end(function (err, res) {
                    res.status.should.eql(301);
                    request.get('/' + date + '/welcome-to-ghost/')
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
            request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        it('should serve sitemap-posts.xml', function (done) {
            request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        it('should serve sitemap-pages.xml', function (done) {
            request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(doEnd(done));
        });

        // TODO: Other pages and verify content
    });
});
