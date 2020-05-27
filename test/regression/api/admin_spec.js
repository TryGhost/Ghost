// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

const should = require('should');

const supertest = require('supertest');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const ghost = testUtils.startGhost;
const {i18n} = require('../../../core/server/lib/common');
const config = require('../../../core/shared/config');
let request;

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

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
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

    describe('Admin Redirects', function () {
        it('should redirect /GHOST/ to /ghost/', function (done) {
            request.get('/GHOST/')
                .expect('Location', '/ghost/')
                .expect(301)
                .end(doEndNoAuth(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('Require HTTPS - redirect', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'https://localhost:2390');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            urlUtils.restore();
            configUtils.restore();
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
