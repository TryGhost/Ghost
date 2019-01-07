const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../server/config');

// Values to test against
const publicSettings = require('../../../../../server/services/settings/public');
const defaultSettings = require('../../../../../server/data/schema').defaultSettings.blog;

const ghost = testUtils.startGhost;
let request;

describe('Settings', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            }).then(function () {
                return testUtils.initFixtures('api_keys');
            });
    });

    it('browse settings', function () {
        const key = localUtils.getValidKey();
        return request.get(localUtils.API.getApiQuery(`settings/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                res.headers.vary.should.eql('Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.settings);
                should.exist(jsonResponse.meta);

                jsonResponse.settings.should.be.an.Object();
                const settings = jsonResponse.settings;

                // Verify we have the right keys for settings
                settings.should.have.properties(_.values(publicSettings));

                // Verify that we are returning the defaults for each value
                _.forEach(settings, (value, key) => {
                    let defaultKey = _.findKey(publicSettings, (v) => v === key);
                    let defaultValue = _.find(defaultSettings, (setting) => setting.key === defaultKey).defaultValue;

                    // Convert empty strings to null
                    defaultValue = defaultValue || null;

                    if (defaultKey === 'navigation') {
                        defaultValue = JSON.parse(defaultValue);
                    }

                    should(value).eql(defaultValue);
                });
            });
    });
});
