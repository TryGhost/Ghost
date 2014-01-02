/*global describe, it, before, after */

// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request    = require('supertest'),
    should     = require('should'),
    moment     = require('moment'),

    testUtils  = require('../../utils'),
    config     = require('../../../server/config'),

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
                    expires = moment(res.headers.date).add('Hours', 12).format("ddd, DD MMM YYYY HH:mm");
                    expires = new RegExp("Expires=" + expires);

                    res.headers['set-cookie'].should.match(expires);

                    done();
                });
        });

        it('should redirect from /ghost to /ghost/signup when no user', function (done) {
            request.get('/ghost/')
                .expect('Location', /ghost\/signup/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect from /ghost/signin to /ghost/signup when no user', function (done) {
            request.get('/ghost/signin/')
                .expect('Location', /ghost\/signup/)
                .expect('Cache-Control', cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should respond with html for /ghost/signup', function (done) {
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
});