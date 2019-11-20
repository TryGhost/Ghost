const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const settingsCache = require('../../../server/services/settings/cache');

const ghost = testUtils.startGhost;

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

        it('should not serve members js file', function () {
            return request.get('/public/members.js')
                .expect(200);
        });
    });

    describe('Members disabled', function () {
        it('should not serve members js file', function () {
            return request.get('/public/members.js')
                .expect(404);
        });
    });
});
