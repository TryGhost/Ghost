// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../utils'),
    ghost = testUtils.startGhost,
    i18n = require('../../../../core/server/i18n'),
    config = require('../../../../core/server/config'),
    request;

i18n.init();

describe('Admin Routing', function () {
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

    before(testUtils.teardown);

    describe('NO FORK', function () {
        var ghostServer;

        before(function (done) {
            ghost().then(function (_ghostServer) {
                ghostServer = _ghostServer;
                return ghostServer.start();
            }).then(function () {
                request = supertest.agent(config.get('url'));
                done();
            }).catch(function (e) {
                console.log('Ghost Error: ', e);
                console.log(e.stack);
                done(e);
            });
        });

        after(function () {
            return testUtils.clearData()
                .then(function () {
                    return ghostServer.stop();
                });
        });

        describe('Assets', function () {
            it('should return 404 for unknown assets', function (done) {
                request.get('/ghost/assets/not-found.js')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(doEnd(done));
            });

            it('should retrieve built assets', function (done) {
                request.get('/ghost/assets/vendor.js')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(200)
                    .end(doEnd(done));
            });
        });

        describe('Legacy Redirects', function () {
            it('should redirect /logout/ to /ghost/#/signout/', function (done) {
                request.get('/logout/')
                    .expect('Location', '/ghost/#/signout/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEndNoAuth(done));
            });

            it('should redirect /signout/ to /ghost/#/signout/', function (done) {
                request.get('/signout/')
                    .expect('Location', '/ghost/#/signout/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEndNoAuth(done));
            });

            it('should redirect /signup/ to /ghost/#/signup/', function (done) {
                request.get('/signup/')
                    .expect('Location', '/ghost/#/signup/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEndNoAuth(done));
            });

            // Admin aliases
            it('should redirect /signin/ to /ghost/', function (done) {
                request.get('/signin/')
                    .expect('Location', '/ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEndNoAuth(done));
            });

            it('should redirect /admin/ to /ghost/', function (done) {
                request.get('/admin/')
                    .expect('Location', '/ghost/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEndNoAuth(done));
            });

            it('should redirect /GHOST/ to /ghost/', function (done) {
                request.get('/GHOST/')
                    .expect('Location', '/ghost/')
                    .expect(301)
                    .end(doEndNoAuth(done));
            });
        });
    });

    describe('FORK', function () {
        // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
        describe('Require HTTPS - redirect', function () {
            var forkedGhost;

            before(function (done) {
                testUtils.fork.ghost({
                    url: 'https://localhost/',
                    server: {
                        port: 2390
                    }
                }, 'testhttps')
                    .then(function (child) {
                        forkedGhost = child;
                        request = supertest.agent('http://localhost:2390');
                    }).then(done)
                    .catch(done);
            });

            after(function (done) {
                if (forkedGhost) {
                    forkedGhost.kill(done);
                } else {
                    done(new Error('No forked ghost process exists, test setup must have failed.'));
                }
            });

            it('should redirect admin access over non-HTTPS', function (done) {
                request.get('/ghost/')
                    .expect('Location', /^https:\/\/localhost:2390\/ghost\//)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should allow admin access over HTTPS', function (done) {
                request.get('/ghost/')
                    .set('X-Forwarded-Proto', 'https')
                    .expect(200)
                    .end(doEnd(done));
            });
        });
    });
});
