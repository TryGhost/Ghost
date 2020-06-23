const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

// Values to test against
const publicSettings = require('../../../core/server/services/settings/public');
const defaultSettings = require('../../../core/server/data/schema').defaultSettings.site;

const ghost = testUtils.startGhost;
let request;

const defaultSettingsKeys = [
    'title',
    'description',
    'logo',
    'icon',
    'cover_image',
    'facebook',
    'twitter',
    'lang',
    'timezone',
    'codeinjection_head',
    'codeinjection_foot',
    'navigation',
    'secondary_navigation',
    'meta_title',
    'meta_description',
    'og_image',
    'og_title',
    'og_description',
    'twitter_image',
    'twitter_title',
    'twitter_description',
    'url'
];

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
                    return (o !== 'brand');
                });

                // settings.should.have.properties(publicProperties);
                // Object.keys(settings).length.should.equal(22);
                Object.keys(settings).should.deepEqual(defaultSettingsKeys);
                // Verify that we are returning the defaults for each value
                _.forEach(settings, (value, key) => {
                    // `url` does not come from the settings cache
                    if (key === 'url') {
                        should(value).eql(`${config.get('url')}/`);
                        return;
                    }

                    let defaultKey = _.findKey(publicSettings, v => v === key);
                    let defaultValue = _.find(defaultSettings, setting => setting.key === defaultKey).defaultValue;

                    // Convert empty strings to null
                    defaultValue = defaultValue || null;

                    if (defaultKey === 'navigation' || defaultKey === 'secondary_navigation') {
                        defaultValue = JSON.parse(defaultValue);
                    }

                    should(value).eql(defaultValue);
                });
            });
    });
});
