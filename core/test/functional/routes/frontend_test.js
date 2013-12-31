/*global describe, it, before, after */

// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request   = require('supertest'),
    should    = require('should'),
    moment    = require('moment'),

    testUtils = require('../../utils'),
    config    = require('../../../server/config');

describe('Frontend Routing', function () {
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }
            done();
        };
    }

    before(function (done) {
        testUtils.clearData().then(function () {
            // we initialise data, but not a user. No user should be required for navigating the frontend
            return testUtils.initData();
        }).then(function () {
            done();
        }, done);

        // Setup the request object with the correct URL
        request = request(config().url);
    });

    describe('Home', function () {
        it('should respond with html', function (done) {
            request.get('/')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(doEnd(done));
        });

        it('should not have as second page', function (done) {
            request.get('/page/2/')
                .expect('Location', '/')
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Welcome post', function () {
        it('should redirect without slash', function (done) {
            request.get('/welcome-to-ghost')
                .expect('Location', '/welcome-to-ghost/')
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/welcome-to-ghost/')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(doEnd(done));
        });

        it('should not work with date permalinks', function (done) {
            // get today's date
            var date  = moment().format("YYYY/MM/DD");

            console.log('date', date);

            request.get('/' + date + '/welcome-to-ghost/')
                .expect(404)
                // TODO this error message is inconsistent
                .expect(/Page Not Found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown post', function (done) {
            request.get('/spectacular/')
                .expect(404)
                // TODO this error message is inconsistent
                .expect(/Post not found/)
                .end(doEnd(done));
        });
    });

    describe('RSS', function () {
        it('should redirect without slash', function (done) {
            request.get('/rss')
                .expect('Location', '/rss/')
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/rss/')
                .expect('Content-Type', /xml/)
                .expect(200)
                .end(doEnd(done));
        });

        it('should not have as second page', function (done) {
            request.get('/rss/2/')
                // TODO this should probably redirect straight to /rss/ ?
                .expect('Location', '/rss/1/')
                .expect(302)
                .end(doEnd(done));
        });
    });

    // ### The rest of the tests require more data

    describe('Archive pages', function () {

        // Add enough posts to trigger pages for both the archive (6 pp) and rss (15 pp)
        // insertPosts adds 5 published posts, 1 draft post, 1 published static page and one draft page
        // we then insert with max 11 which ensures we have 16 published posts
        before(function (done) {
            testUtils.insertPosts().then(function () {
                return testUtils.insertMorePosts(11);
            }).then(function () {
                done();
            }).then(null, done);
        });

        it('should redirect without slash', function (done) {
            request.get('/page/2')
                .expect('Location', '/page/2/')
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with html', function (done) {
            request.get('/page/2/')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/page/1/')
                .expect('Location', '/')
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page is page too high', function (done) {
            request.get('/page/4/')
                .expect('Location', '/page/3/')
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page is page too low', function (done) {
            request.get('/page/0/')
                .expect('Location', '/')
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('RSS pages', function () {
        it('should redirect without slash', function (done) {
            request.get('/rss/2')
                .expect('Location', '/rss/2/')
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/rss/2/')
                .expect('Content-Type', /xml/)
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect page 1', function (done) {
            request.get('/rss/1/')
                .expect('Location', '/rss/')
                // TODO: This should probably be a 301?
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to last page is page too high', function (done) {
            request.get('/rss/3/')
                .expect('Location', '/rss/2/')
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect to first page is page too low', function (done) {
            request.get('/rss/0/')
                .expect('Location', '/rss/')
                .expect(302)
                .end(doEnd(done));
        });
    });

    describe('Static page', function () {
        it('should redirect without slash', function (done) {
            request.get('/static-page-test')
                .expect('Location', '/static-page-test/')
                .expect(301)
                .end(doEnd(done));
        });

        it('should respond with xml', function (done) {
            request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect(200)
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
//            console.log('date', date);
//
//            request.get('/' + date + '/welcome-to-ghost/')
//                .expect(200)
//                .expect('Content-Type', /html/)
//                .end(doEnd(done));
//        });
//    });

});



