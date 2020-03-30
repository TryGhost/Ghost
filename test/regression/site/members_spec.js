const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const settingsCache = require('../../../core/server/services/settings/cache');

const ghost = testUtils.startGhost;

// NOTE: if only this suite is run some of the tests will fail due to
//       wrong template loading issues which would need to be investigated
//       As a workaround run it with some of other tests e.g. "frontend_spec"
describe('Integration - Web - Members', function () {
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
            it('should error when invalid member token is passed in to ssr', function () {
                return request.get('/members/ssr')
                    .expect(400);
            });

            it('should return no content when removing member sessions', function () {
                return request.del('/members/ssr')
                    .expect(204);
            });

            it('should error serving webhook endpoint without any parameters', function () {
                return request.post('/members/webhooks/stripe')
                    .expect(400);
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
            it('should not serve ssr endpoint', function () {
                return request.get('/members/ssr')
                    .expect(404);
            });

            it('should not serve ssr removal endpoint', function () {
                return request.del('/members/ssr')
                    .expect(404);
            });

            it('should not serve webhook endpoint', function () {
                return request.post('/members/webhooks/stripe')
                    .expect(404);
            });
        });
    });
});
