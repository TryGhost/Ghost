const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

// Values to test against
const publicSettings = require('../../../core/shared/settings-cache/public');
const defaultSettings = require('../../../core/server/data/schema').defaultSettings;

const defaultSettingsKeys = [
    'title',
    'description',
    'logo',
    'icon',
    'accent_color',
    'cover_image',
    'facebook',
    'twitter',
    'lang',
    'locale',
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
    'members_support_address',
    'url'
];

describe('Settings Content API', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('api_keys');
    });

    it('Can request settings', async function () {
        const key = localUtils.getValidKey();
        const res = await request.get(localUtils.API.getApiQuery(`settings/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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

        const flattenedPublicSettings = [];
        _.each(defaultSettings, function each(_settings) {
            _.each(_settings, function eachSetting(setting) {
                const flags = setting.flags || '';
                if (setting.group === 'site' || (flags.includes('PUBLIC'))) {
                    flattenedPublicSettings.push(setting);
                }
            });
        });

        settings.should.have.properties(publicProperties);

        // The length below should only change when public settings have been removed or added
        Object.keys(settings).length.should.equal(25);
        Object.keys(settings).should.deepEqual(defaultSettingsKeys);

        // Verify that we are returning the defaults for each value
        _.forEach(settings, (value, settingsKey) => {
            // `url` does not come from the settings cache
            if (settingsKey === 'url') {
                should(value).eql(`${config.get('url')}/`);
                return;
            }

            let defaultKey = publicSettings[settingsKey];
            let defaultValue = _.find(flattenedPublicSettings, setting => setting.key === defaultKey).defaultValue;

            // Convert empty strings to null
            defaultValue = defaultValue || null;

            if (defaultKey === 'navigation' || defaultKey === 'secondary_navigation') {
                defaultValue = JSON.parse(defaultValue);
            }

            should(value).eql(defaultValue);
        });
    });
});
