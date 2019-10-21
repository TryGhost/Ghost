const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const config = require('../../../server/config');
const localUtils = require('./utils');

// Values to test against
const publicSettings = require('../../../server/services/settings/public');
const defaultSettings = require('../../../server/data/schema').defaultSettings.blog;

const ghost = testUtils.startGhost;
let request;

describe('Settings Content API', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            }).then(function () {
                return testUtils.initFixtures('api_keys');
            });
    });

    it('Can request settings', function () {
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
                const publicProperties = _.filter(_.values(publicSettings), (o) => {
                    return (o !== 'ghost_head' && o !== 'ghost_foot');
                });
                publicProperties.push('codeinjection_head', 'codeinjection_foot');
                settings.should.have.properties(publicProperties);
                Object.keys(settings).length.should.equal(21);

                // Verify that we are returning the defaults for each value
                _.forEach(settings, (value, key) => {
                    /**
                     * @TODO:
                     * This test is coupled with the settings cache and the model schema.
                     * This test should compare against the API result using the test utility.
                     * The settings cache should only cache model responses and should not know about
                     * API or theme formats.
                     *
                     * This is just a hack to be able to alias ghost_head & ghost_foot quickly.
                     */
                    if (['codeinjection_head', 'codeinjection_foot'].includes(key)) {
                        return;
                    }

                    // `url` does not come from the settings cache
                    if (key === 'url') {
                        should(value).eql(`${config.get('url')}/`);
                        return;
                    }

                    let defaultKey = _.findKey(publicSettings, v => v === key);
                    let defaultValue = _.find(defaultSettings, setting => setting.key === defaultKey).defaultValue;

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
