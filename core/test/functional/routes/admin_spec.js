// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request = require('supertest'),
    should = require('should'),
    testUtils = require('../../utils'),
    ghost = require('../../../../core'),
    config = require('../../../../core/server/config'),
    i18n = require('../../../../core/server/i18n');

i18n.init();

describe('Admin Routing', function () {
    var scope = {};

    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
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
            should.exist(res.headers.date);

            done();
        };
    }

    before(function (done) {
        scope.startGhost = function (innerDone) {
            ghost().then(function (ghostServer) {
                scope.ghostServer = ghostServer;

                // Setup the request object with the ghost express app
                scope.request = request(ghostServer.rootApp);

                innerDone();
            }).catch(function (e) {
                console.log('Ghost Error: ', e);
                console.log(e.stack);
                innerDone(e);
            });
        };

        scope.shutdownGhost = function (innerDone) {
            scope.ghostServer.stop()
                .then(function () {
                    innerDone();
                })
                .catch(function (err) {
                    innerDone(err);
                });
        };

        scope.startGhost(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            scope.shutdownGhost(done);
        }).catch(done);
    });

    describe('Legacy Redirects', function () {
        it('should redirect /logout/ to /ghost/signout/', function (done) {
            scope.request.get('/logout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signout/ to /ghost/signout/', function (done) {
            scope.request.get('/signout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signup/ to /ghost/signup/', function (done) {
            scope.request.get('/signup/')
                .expect('Location', '/ghost/signup/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        // Admin aliases
        it('should redirect /signin/ to /ghost/', function (done) {
            scope.request.get('/signin/')
                .expect('Location', '/ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /admin/ to /ghost/', function (done) {
            scope.request.get('/admin/')
                .expect('Location', '/ghost/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /GHOST/ to /ghost/', function (done) {
            scope.request.get('/GHOST/')
                .expect('Location', '/ghost/')
                .expect(301)
                .end(doEndNoAuth(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('Require HTTPS - no redirect', function () {
        it('set config', function () {
            config.set({forceAdminSSL: {redirect: false}});
        });

        it('should block admin access over non-HTTPS', function (done) {
            scope.request.get('/ghost/')
                .expect(403)
                .end(doEnd(done));
        });

        it('should allow admin access over HTTPS', function (done) {
            scope.request.get('/ghost/setup/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Require HTTPS - redirect', function () {
        it('set config', function () {
            config.set({forceAdminSSL: {redirect: true}});
            config.set({urlSSL: 'https://localhost/'});
        });

        it('should redirect admin access over non-HTTPS', function (done) {
            scope.request.get('/ghost/')
                .expect('Location', /^https:\/\/localhost\/ghost\//)
                .expect(301)
                .end(doEnd(done));
        });

        it('should allow admin access over HTTPS', function (done) {
            scope.request.get('/ghost/setup/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Ghost Admin Setup', function () {
        // reset config!
        it('set config', function () {
            config.set({forceAdminSSL: null});
        });

        it('should redirect from /ghost/ to /ghost/setup/ when no user/not installed yet', function (done) {
            scope.request.get('/ghost/')
                .expect('Location', /ghost\/setup/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect from /ghost/signin/ to /ghost/setup/ when no user', function (done) {
            scope.request.get('/ghost/signin/')
                .expect('Location', /ghost\/setup/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(302)
                .end(doEnd(done));
        });

        it('should respond with html for /ghost/setup/', function (done) {
            scope.request.get('/ghost/setup/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(doEnd(done));
        });
    });
});
