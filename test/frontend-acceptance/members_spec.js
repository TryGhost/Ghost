const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/server/services/settings/cache');

// @TODO: if only this suite is run some of the tests will fail due to
//       wrong template loading issues which would need to be investigated
//       As a workaround run it with some of other tests e.g. "frontend_spec"
describe('Basic Members Routes', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    before(function () {
        const originalSettingsCacheGetFn = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'labs') {
                return {members: true};
            }

            return originalSettingsCacheGetFn(key, options);
        });
    });

    after(function () {
        sinon.restore();
    });

    describe('Routes', function () {
        it('should error serving webhook endpoint without any parameters', async function () {
            await request.post('/members/webhooks/stripe')
                .expect(400);
        });

        it('should error when invalid member token is passed into session', async function () {
            await request.get('/members/api/session')
                .expect(400);
        });

        it('should return no content when removing member sessions', async function () {
            await request.del('/members/api/session')
                .expect(204);
        });

        it('should error for invalid member token on member data endpoint', async function () {
            await request.get('/members/api/member')
                .expect(400);
        });

        it('should serve member site endpoint', async function () {
            await request.get('/members/api/site')
                .expect(200);
        });

        it('should error for invalid data on member magic link endpoint', async function () {
            await request.post('/members/api/send-magic-link')
                .expect(400);
        });

        it('should error for invalid data on members create checkout session endpoint', async function () {
            await request.post('/members/api/create-stripe-checkout-session')
                .expect(400);
        });

        it('should error for invalid data on members create update session endpoint', async function () {
            await request.post('/members/api/create-stripe-update-session')
                .expect(400);
        });

        it('should error for invalid data on members subscription endpoint', async function () {
            await request.put('/members/api/subscriptions/123')
                .expect(400);
        });

        it('should serve theme 404 on members endpoint', async function () {
            await request.get('/members/')
                .expect(404)
                .expect('Content-Type', 'text/html; charset=utf-8');
        });

        it('should redirect invalid token on members endpoint', async function () {
            await request.get('/members/?token=abc&action=signup')
                .expect(302)
                .expect('Location', '/?action=signup&success=false');
        });
    });
});
