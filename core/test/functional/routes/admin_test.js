/*global describe, it, before, after */

// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var request    = require('supertest'),
    should     = require('should'),

    testUtils  = require('../../utils'),
    ghost      = require('../../../../core');

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

    before(function (done) {
        ghost().then(function (ghostServer) {
            // Setup the request object with the ghost express app
            request = request(ghostServer.rootApp);

            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('Legacy Redirects', function () {
        it('should redirect /logout/ to /ghost/signout/', function (done) {
            request.get('/logout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signout/ to /ghost/signout/', function (done) {
            request.get('/signout/')
                .expect('Location', '/ghost/signout/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        it('should redirect /signup/ to /ghost/signup/', function (done) {
            request.get('/signup/')
                .expect('Location', '/ghost/signup/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .end(doEndNoAuth(done));
        });

        // Admin aliases
        it('should redirect /signin/ to /ghost/', function (done) {
            request.get('/signin/')
                .expect('Location', '/ghost/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(302)
                .end(doEndNoAuth(done));
        });

        it('should redirect /admin/ to /ghost/', function (done) {
            request.get('/admin/')
                .expect('Location', '/ghost/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(302)
                .end(doEndNoAuth(done));
        });

        it('should redirect /GHOST/ to /ghost/', function (done) {
            request.get('/GHOST/')
                .expect('Location', '/ghost/')
                .expect(301)
                .end(doEndNoAuth(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('Require HTTPS - no redirect', function () {
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

        it('should block admin access over non-HTTPS', function (done) {
            request.get('/ghost/')
                .expect(403)
                .end(done);
        });

        it('should allow admin access over HTTPS', function (done) {
            request.get('/ghost/setup/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Require HTTPS - redirect', function () {
        var forkedGhost, request;
        before(function (done) {
            var configTestHttps = testUtils.fork.config();
            configTestHttps.forceAdminSSL = {redirect: true};
            configTestHttps.urlSSL = 'https://localhost/';

            testUtils.fork.ghost(configTestHttps, 'testhttps')
                .then(function (child) {
                    forkedGhost = child;
                    request = require('supertest');
                    request = request(configTestHttps.url.replace(/\/$/, ''));
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
                .expect('Location', /^https:\/\/localhost\/ghost\//)
                .expect(301)
                .end(done);
        });

        it('should allow admin access over HTTPS', function (done) {
            request.get('/ghost/setup/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .end(done);
        });
    });

    describe('Ghost Admin Setup', function () {
        it('should redirect from /ghost/ to /ghost/setup/ when no user/not installed yet', function (done) {
            request.get('/ghost/')
                .expect('Location', /ghost\/setup/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should redirect from /ghost/signin/ to /ghost/setup/ when no user', function (done) {
            request.get('/ghost/signin/')
                .expect('Location', /ghost\/setup/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(302)
                .end(doEnd(done));
        });

        it('should respond with html for /ghost/setup/', function (done) {
            request.get('/ghost/setup/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
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
//
//    describe('Ghost Admin Forgot Password', function () {
//        before(function (done) {
//            // Create a user / do setup etc
//            testUtils.clearData()
//                .then(function () {
//                    return testUtils.initData();
//                })
//                .then(function () {
//                    return testUtils.insertDefaultFixtures();
//                }).then(function () {
//                    done();
//                })
//                .catch(done);
//        });
//
//        it('should respond with html for /ghost/forgotten/', function (done) {
//            request.get('/ghost/forgotten/')
//                .expect('Content-Type', /html/)
//                .expect('Cache-Control', testUtils.cacheRules['private'])
//                .expect(200)
//                .end(doEnd(done));
//        });
//
//        it('should respond 404 for /ghost/reset/', function (done) {
//            request.get('/ghost/reset/')
//                .expect('Cache-Control', testUtils.cacheRules['private'])
//                .expect(404)
//                .expect(/Page Not Found/)
//                .end(doEnd(done));
//        });
//
//        it('should redirect /ghost/reset/*/', function (done) {
//            request.get('/ghost/reset/athing/')
//                .expect('Location', /ghost\/forgotten/)
//                .expect('Cache-Control', testUtils.cacheRules['private'])
//                .expect(302)
//                .end(doEnd(done));
//        });
//    });
// });

// TODO: not working anymore, needs new test for Ember
// describe('Authenticated Admin Routing', function () {
//     var user = testUtils.DataGenerator.forModel.users[0];

//     before(function (done) {
//         var app = express();

//         ghost({app: app}).then(function (_ghostServer) {
//             ghostServer = _ghostServer;
//             request = agent(app);

//             testUtils.clearData()
//                 .then(function () {
//                     return testUtils.initData();
//                 })
//                 .then(function () {
//                     return testUtils.insertDefaultFixtures();
//                 })
//                 .then(function () {

//                     request.get('/ghost/signin/')
//                         .expect(200)
//                         .end(function (err, res) {
//                             if (err) {
//                                 return done(err);
//                             }

//                             process.nextTick(function () {
//                                 request.post('/ghost/signin/')
//                                     .send({email: user.email, password: user.password})
//                                     .expect(200)
//                                     .end(function (err, res) {
//                                         if (err) {
//                                             return done(err);
//                                         }

//                                         request.saveCookies(res);
//                                         request.get('/ghost/')
//                                             .expect(200)
//                                             .end(function (err, res) {
//                                                 if (err) {
//                                                     return done(err);
//                                                 }

//                                                 done();
//                                             });
//                                     });

//                             });

//                         });
//                 }).catch(done);
//         }).catch(function (e) {
//             console.log('Ghost Error: ', e);
//             console.log(e.stack);
//         });
//     });

//     after(function () {
//         ghostServer.stop();
//     });

//     describe('Ghost Admin magic /view/ route', function () {

//         it('should redirect to the single post page on the frontend', function (done) {
//             request.get('/ghost/editor/1/view/')
//                 .expect(302)
//                 .expect('Location', '/welcome-to-ghost/')
//                 .end(function (err, res) {
//                     if (err) {
//                         return done(err);
//                     }

//                     done();
//                 });
//         });
//     });
});
