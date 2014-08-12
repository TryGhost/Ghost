/*global describe, it, before, after */

// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request    = require('supertest'),
    express    = require('express'),
    should     = require('should'),
    moment     = require('moment'),
    path       = require('path'),

    testUtils  = require('../../utils'),
    ghost      = require('../../../../core'),
    httpServer,

    cacheRules = {
        'public': 'public, max-age=0',
        'hour':  'public, max-age=' + testUtils.ONE_HOUR_S,
        'year':  'public, max-age=' + testUtils.ONE_YEAR_S,
        'private': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    };

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

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            // Setup the request object with the ghost express app
            httpServer = _httpServer;
            request = request(app);
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {
                done();
            }).catch(done);
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    describe('Home', function () {
        it('should respond with html', function (done) {
            request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should not have as second page', function (done) {
            request.get('/page/2/')
                .expect('Location', '/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Welcome post', function () {
        it('should redirect without slash', function (done) {
            request.get('/welcome-to-ghost')
                .expect('Location', '/welcome-to-ghost/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/welcome-to-ghost/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should not work with date permalinks', function (done) {
            // get today's date
            var date  = moment().format("YYYY/MM/DD");

            request.get('/' + date + '/welcome-to-ghost/')
                //.expect('Cache-Control', cacheRules['private'])
                .expect(404)
                .expect(/Page Not Found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown post', function (done) {
            request.get('/spectacular/')
                .expect('Cache-Control', cacheRules['private'])
                .expect(404)
                .expect(/Page Not Found/)
                .end(doEnd(done));
        });
    });

    describe('Post edit', function () {
        it('should redirect without slash', function (done) {
            request.get('/welcome-to-ghost/edit')
                .expect('Location', '/welcome-to-ghost/edit/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should redirect to editor', function (done) {
            request.get('/welcome-to-ghost/edit/')
                .expect('Location', '/ghost/editor/1/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should 404 for non-edit parameter', function (done) {
            request.get('/welcome-to-ghost/notedit/')
                .expect('Cache-Control', cacheRules['private'])
                .expect(404)
                .expect(/Page Not Found/)
                .end(doEnd(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('HTTPS', function() {
        var forkedGhost, request;
        before(function (done) {
            var configTestHttps = testUtils.fork.config();
            configTestHttps.forceAdminSSL = {redirect: false};
            configTestHttps.urlSSL = 'https://localhost/';

            testUtils.fork.ghost(configTestHttps, 'testhttps')
                .then(function(child) {
                    forkedGhost = child;
                    request = require('supertest');
                    request = request(configTestHttps.url.replace(/\/$/, ''));
                }).then(done).catch(done);
        });

        after(function (done) {
            if (forkedGhost) {
                forkedGhost.kill(done);
            }
        });

        it('should set links to url over non-HTTPS', function(done) {
            request.get('/')
                .expect(200)
                .expect(/\<link rel="canonical" href="http:\/\/127.0.0.1:2370\/" \/\>/)
                .expect(/\<a href="http:\/\/127.0.0.1:2370">Ghost\<\/a\>/)
                .end(doEnd(done));
        });

        it('should set links to urlSSL over HTTPS', function(done) {
            request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/\<link rel="canonical" href="https:\/\/localhost\/" \/\>/)
                .expect(/\<a href="https:\/\/localhost">Ghost\<\/a\>/)
                .end(doEnd(done));
        });
    });

    describe('RSS', function () {
        it('should redirect without slash', function (done) {
            request.get('/rss')
                .expect('Location', '/rss/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/rss/')
                .expect('Content-Type', /xml/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should not have as second page', function (done) {
            request.get('/rss/2/')
                // TODO this should probably redirect straight to /rss/ with 301?
                .expect('Location', '/rss/1/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should get redirected to /rss/ from /feed/', function (done) {
            request.get('/feed/')
                .expect('Location', '/rss/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });
    });

    // ### The rest of the tests require more data

    describe('Archive pages', function () {

        // Add enough posts to trigger pages for both the archive (5 pp) and rss (15 pp)
        // insertPosts adds 5 published posts, 1 draft post, 1 published static page and one draft page
        // we then insert with max 11 which ensures we have 16 published posts
        before(function (done) {
            testUtils.fixtures.insertPosts().then(function () {
                return testUtils.fixtures.insertMorePosts(9);
            }).then(function () {
                done();
            }).catch(done);
        });

        it('should redirect without slash', function (done) {
            request.get('/page/2')
                .expect('Location', '/page/2/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/page/2/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/page/1/')
                .expect('Location', '/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/page/4/')
                .expect('Location', '/page/3/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/page/0/')
                .expect('Location', '/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('RSS pages', function () {
        before(function (done) {
            testUtils.fixtures.insertMorePosts(2).then(function () {
                done();
            }).catch(done);
        });
        it('should redirect without slash', function (done) {
            request.get('/rss/2')
                .expect('Location', '/rss/2/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/rss/2/')
                .expect('Content-Type', /xml/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/rss/1/')
                .expect('Location', '/rss/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/rss/3/')
                .expect('Location', '/rss/2/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/rss/0/')
                .expect('Location', '/rss/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Tag based RSS pages', function () {
        it('should redirect without slash', function (done) {
            request.get('/tag/getting-started/rss')
                .expect('Location', '/tag/getting-started/rss/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/tag/getting-started/rss/')
                .expect('Content-Type', /xml/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/tag/getting-started/rss/1/')
                .expect('Location', '/tag/getting-started/rss/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/tag/getting-started/rss/2/')
                .expect('Location', '/tag/getting-started/rss/1/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/tag/getting-started/rss/0/')
                .expect('Location', '/tag/getting-started/rss/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Author based RSS pages', function () {
        it('should redirect without slash', function (done) {
            request.get('/author/ghost-owner/rss')
                .expect('Location', '/author/ghost-owner/rss/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/author/ghost-owner/rss/')
                .expect('Content-Type', /xml/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/author/ghost-owner/rss/1/')
                .expect('Location', '/author/ghost-owner/rss/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/author/ghost-owner/rss/3/')
                .expect('Location', '/author/ghost-owner/rss/2/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/author/ghost-owner/rss/0/')
                .expect('Location', '/author/ghost-owner/rss/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Static page', function () {
        it('should redirect without slash', function (done) {
            request.get('/static-page-test')
                .expect('Location', '/static-page-test/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Post with Ghost in the url', function () {
        // All of Ghost's admin depends on the /ghost/ in the url to work properly
        // Badly formed regexs can cause breakage if a post slug starts with the 5 letters ghost
        it('should retrieve a blog post with ghost at the start of the url', function (done) {
            request.get('/ghostly-kitchen-sink/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Static assets', function () {
        it('should retrieve shared assets', function (done) {
            request.get('/shared/img/user-image.png')
                .expect('Cache-Control', cacheRules.hour)
                .expect(200)
                .end(doEnd(done));
        });

        it('should retrieve theme assets', function (done) {
            request.get('/assets/css/screen.css')
                .expect('Cache-Control', cacheRules.year)
                .expect(200)
                .end(doEnd(done));
        });

        it('should retrieve built assets', function (done) {
            request.get('/ghost/scripts/vendor-dev.js')
                .expect('Cache-Control', cacheRules.year)
                .expect(200)
                .end(doEnd(done));
        });

        it('should retrieve default robots.txt', function (done) {
            request.get('/robots.txt')
                .expect('Cache-Control', cacheRules.year)
                .expect(200)
                .end(doEnd(done));
        });

        // at the moment there is no image fixture to test
        // it('should retrieve image assets', function (done) {
        // request.get('/content/images/some.jpg')
        //    .expect('Cache-Control', cacheRules.year)
        //    .end(doEnd(done));
        // });
    });

    describe('Tag pages', function () {

        // Add enough posts to trigger tag pages
        before(function (done) {
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {

                return testUtils.fixtures.insertPosts();
            }).then(function () {
                return testUtils.fixtures.insertMorePosts(22);
            }).then(function () {
                return testUtils.fixtures.insertMorePostsTags(22);
            }).then(function () {
                done();
            }).catch(done);

        });

        it('should redirect without slash', function (done) {
            request.get('/tag/injection/page/2')
                .expect('Location', '/tag/injection/page/2/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/tag/injection/page/2/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/tag/injection/page/1/')
                .expect('Location', '/tag/injection/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/tag/injection/page/4/')
                .expect('Location', '/tag/injection/page/3/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/tag/injection/page/0/')
                .expect('Location', '/tag/injection/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Author pages', function () {

        // Add enough posts to trigger tag pages
        before(function (done) {
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {

                return testUtils.fixtures.insertPosts();
            }).then(function () {
                return testUtils.fixtures.insertMorePosts(10);
            }).then(function () {
                done();
            }).catch(done);
        });

        it('should redirect without slash', function (done) {
            request.get('/author/ghost-owner/page/2')
                .expect('Location', '/author/ghost-owner/page/2/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/author/ghost-owner/page/2/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['public'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/author/ghost-owner/page/1/')
                .expect('Location', '/author/ghost-owner/')
                .expect('Cache-Control', cacheRules['public'])
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page if page too high', function (done) {
            request.get('/author/ghost-owner/page/4/')
                .expect('Location', '/author/ghost-owner/page/3/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page if page too low', function (done) {
            request.get('/author/ghost-owner/page/0/')
                .expect('Location', '/author/ghost-owner/')
                .expect('Cache-Control', cacheRules['public'])
                .expect(302)
                .end(doEnd(done));
        });
    });


    // ### The rest of the tests switch to date permalinks

//    describe('Date permalinks', function () {
//        before(function (done) {
//            // Only way to swap permalinks setting is to login and visit the URL because
//            // poking the database doesn't work as settings are cached
//        });
//
//        it('should load a post with date permalink', function (done) {
//
//            // get today's date
//            var date  = moment().format("YYYY/MM/DD");
//
//
//            request.get('/' + date + '/welcome-to-ghost/')
//                .expect(200)
//                .expect('Content-Type', /html/)
//                .end(doEnd(done));
//        });
//    });

});



