// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

const should = require('should');

const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const urlUtils = require('../utils/urlUtils');
const adminUtils = require('../utils/admin-utils');
const config = require('../../core/shared/config');
let request;

function assertCorrectHeaders(res) {
    should.not.exist(res.headers['x-cache-invalidate']);
    should.exist(res.headers.date);
}

describe('Admin Routing', function () {
    before(async function () {
        adminUtils.stubClientFiles();

        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    describe('Assets', function () {
        it('should return 404 for unknown assets', async function () {
            request.get('/ghost/assets/not-found.js')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(assertCorrectHeaders);
        });

        it('should retrieve built assets', async function () {
            request.get('/ghost/assets/vendor.js')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(200)
                .expect(assertCorrectHeaders);
        });
    });

    describe('Admin Redirects', function () {
        it('should redirect /GHOST/ to /ghost/', async function () {
            request.get('/GHOST/')
                .expect('Location', '/ghost/')
                .expect(301)
                .expect(assertCorrectHeaders);
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('Require HTTPS - redirect', function () {
        before(async function () {
            configUtils.set('url', 'https://localhost:2390');
            urlUtils.stubUrlUtilsFromConfig();

            await testUtils.startGhost({forceStart: true});
            request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
        });

        after(function () {
            urlUtils.restore();
            configUtils.restore();
        });

        it('should redirect admin access over non-HTTPS', async function () {
            request.get('/ghost/')
                .expect('Location', /^https:\/\/localhost:2390\/ghost\//)
                .expect(301)
                .expect(assertCorrectHeaders);
        });

        it('should allow admin access over HTTPS', async function () {
            request.get('/ghost/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(assertCorrectHeaders);
        });
    });
});
