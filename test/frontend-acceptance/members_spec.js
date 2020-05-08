const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/server/services/settings/cache');

const ghost = testUtils.startGhost;

// @TODO: if only this suite is run some of the tests will fail due to
//       wrong template loading issues which would need to be investigated
//       As a workaround run it with some of other tests e.g. "frontend_spec"
describe('Basic Members Routes', function () {
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(configUtils.config.get('url'));
            });
    });

    describe('Members enabled', function () {
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

        describe('Static files', function () {
            it('should serve members.js file', function () {
                return request.get('/public/members.js')
                    .expect(200);
            });
        });

        describe('Routes', function () {
            it('should error serving webhook endpoint without any parameters', function () {
                return request.post('/members/webhooks/stripe')
                    .expect(400);
            });

            it('should error when invalid member token is passed into session', function () {
                return request.get('/members/api/session')
                    .expect(400);
            });

            it('should return no content when removing member sessions', function () {
                return request.del('/members/api/session')
                    .expect(204);
            });

            it('should error for invalid member token on member data endpoint', function () {
                return request.get('/members/api/member')
                    .expect(400);
            });

            it('should serve member site endpoint', function () {
                return request.get('/members/api/site')
                    .expect(200);
            });

            it('should error for invalid data on member magic link endpoint', function () {
                return request.post('/members/api/send-magic-link')
                    .expect(400);
            });

            it('should error for invalid data on members create checkout session endpoint', function () {
                return request.post('/members/api/create-stripe-checkout-session')
                    .expect(400);
            });

            it('should error for invalid data on members create update session endpoint', function () {
                return request.post('/members/api/create-stripe-update-session')
                    .expect(400);
            });

            it('should error for invalid data on members subscription endpoint', function () {
                return request.put('/members/api/subscriptions/123')
                    .expect(400);
            });

            it('should serve theme 404 on members endpoint', function () {
                return request.get('/members/')
                    .expect(404)
                    .expect('Content-Type', 'text/html; charset=utf-8');
            });

            it('should redirect invalid token on members endpoint', function () {
                return request.get('/members/?token=abc&action=signup')
                    .expect(302)
                    .expect('Location', '/?action=signup&success=false');
            });
        });
    });

    describe('Members disabled', function () {
        before(function () {
            const originalSettingsCacheGetFn = settingsCache.get;

            sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                if (key === 'labs') {
                    return {members: false};
                }

                return originalSettingsCacheGetFn(key, options);
            });
        });

        after(function () {
            sinon.restore();
        });

        describe('Static files', function () {
            it('should not serve members js file', function () {
                return request.get('/public/members.js')
                    .expect(404);
            });
        });

        describe('Routes', function () {
            it('should not serve webhook endpoint', function () {
                return request.post('/members/webhooks/stripe')
                    .expect(404);
            });

            it('should not serve session endpoint', function () {
                return request.get('/members/api/session')
                    .expect(404);
            });

            it('should not serve session removal endpoint', function () {
                return request.del('/members/api/session')
                    .expect(404);
            });

            it('should not serve member data endpoint', function () {
                return request.get('/members/api/member')
                    .expect(404);
            });

            it('should not serve member site endpoint', function () {
                return request.get('/members/api/site')
                    .expect(404);
            });

            it('should not serve member magic link endpoint', function () {
                return request.post('/members/api/send-magic-link')
                    .expect(404);
            });

            it('should not serve members create checkout session endpoint', function () {
                return request.post('/members/api/create-stripe-checkout-session')
                    .expect(404);
            });

            it('should not serve members create update session endpoint', function () {
                return request.post('/members/api/create-stripe-update-session')
                    .expect(404);
            });

            it('should not serve members subscription endpoint', function () {
                return request.put('/members/api/subscriptions/123')
                    .expect(404);
            });

            it('should serve 404 on members endpoint', function () {
                return request.get('/members/')
                    .expect(404);
            });

            it('should not redirect members endpoint with token', function () {
                return request.get('/members/?token=abc&action=signup')
                    .expect(404);
            });
        });
    });
});
