/*global describe, it, before, after */

// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request    = require('supertest'),
    express    = require('express'),
    should     = require('should'),
    moment     = require('moment'),

    testUtils  = require('../../utils'),
    ghost      = require('../../../../core'),
    httpServer,

    ONE_HOUR_S = 60 * 60,
    ONE_YEAR_S = 365 * 24 * ONE_HOUR_S,
    cacheRules = {
        'public': 'public, max-age=0',
        'hour':  'public, max-age=' + ONE_HOUR_S,
        'year':  'public, max-age=' + ONE_YEAR_S,
        'private': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    };

describe('Admin Routing', function () {
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    function doEndNoAuth(done) {
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
            }, done);
        }).otherwise(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    describe('Legacy Redirects', function () {

        it('should redirect /logout/ to /ghost/signout/', function (done) {
            request.get('/logout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signout/ to /ghost/signout/', function (done) {
            request.get('/signout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signin/ to /ghost/signin/', function (done) {
            request.get('/signin/')
                .expect('Location', '/ghost/signin/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signup/ to /ghost/signup/', function (done) {
            request.get('/signup/')
                .expect('Location', '/ghost/signup/')
                .expect('Cache-Control', cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });
    });

    describe('Ghost Admin Signup', function () {
        it('should have a session cookie which expires in 12 hours', function (done) {
            request.get('/ghost/signup/')
                .end(function firstRequest(err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.not.exist(res.headers['X-CSRF-Token']);
                    should.exist(res.headers['set-cookie']);
                    should.exist(res.headers.date);

                    var expires;
                    // Session should expire 12 hours after the time in the date header
                    expires = moment.utc(res.headers.date).add('Hours', 12).format("ddd, DD MMM YYYY HH:mm");
                    expires = new RegExp("Expires=" + expires);

                    res.headers['set-cookie'].should.match(expires);

                    done();
                });
        });

        it('should redirect from /ghost/ to /ghost/signin/ when no user', function (done) {
            request.get('/ghost/')
                .expect('Location', /ghost\/signin/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect from /ghost/signin/ to /ghost/signup/ when no user', function (done) {
            request.get('/ghost/signin/')
                .expect('Location', /ghost\/signup/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should respond with html for /ghost/signup/', function (done) {
            request.get('/ghost/signup/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(200)
                .end(doEnd(done));
        });

        // Add user

//        it('should redirect from /ghost/signup to /ghost/signin with user', function (done) {
//           done();
//        });

//        it('should respond with html for /ghost/signin', function (done) {
//           done();
//        });

        // Do Login

//        it('should redirect from /ghost/signup to /ghost/ when logged in', function (done) {
//           done();
//        });

//        it('should redirect from /ghost/signup to /ghost/ when logged in', function (done) {
//           done();
//        });

    });

    describe('Ghost Admin Forgot Password', function () {

        it('should respond with html for /ghost/forgotten/', function (done) {
            request.get('/ghost/forgotten/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(200)
                .end(doEnd(done));
        });

        it('should respond 404 for /ghost/reset/', function (done) {
            request.get('/ghost/reset/')
                .expect('Cache-Control', cacheRules['private'])
                .expect(404)
                .expect(/Page Not Found/)
                .end(doEnd(done));
        });

        it('should redirect /ghost/reset/*/', function (done) {
            request.get('/ghost/reset/athing/')
                .expect('Location', /ghost\/forgotten/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });
    });
});
