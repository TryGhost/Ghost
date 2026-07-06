const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyContentLength, anyContentVersion, anyUuid, anyString, anyObject} = matchers;
const labs = require('../../../core/shared/labs');
const models = require('../../../core/server/models');

const settingsMatcher = {
    version: anyString,
    labs: anyObject,
    site_uuid: anyUuid
};

describe('Settings Content API', function () {
    let agent;

    beforeAll(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
        await agent.authenticate();
    });

    it('Can request settings', async function () {
        await agent.get('settings/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-length': anyContentLength
            })
            .matchBodySnapshot({
                settings: settingsMatcher
            });
    });

    it('Includes GA labs flags in settings response', async function () {
        const {body} = await agent.get('settings/')
            .expectStatus(200);

        const settingsLabs = body.settings.labs;
        const allLabs = labs.getAll();

        // GA_FEATURES should be present in the Content API response
        for (const key of labs.GA_KEYS) {
            assert.equal(settingsLabs[key], true, `Expected labs.${key} to be true in Content API settings`);
        }

        // Content API labs should match labs.getAll()
        for (const [key, value] of Object.entries(allLabs)) {
            assert.equal(settingsLabs[key], value, `Expected labs.${key} to be ${value} in Content API settings`);
        }
    });

    describe('Turnstile settings', function () {
        beforeEach(async function () {
            await models.Settings.edit([
                {key: 'turnstile_sitekey', value: 'test-sitekey'},
                {key: 'turnstile_secret_key', value: 'test-secret'}
            ], {context: {internal: true}});
        });

        afterEach(async function () {
            await models.Settings.edit([
                {key: 'turnstile_sitekey', value: null},
                {key: 'turnstile_secret_key', value: null}
            ], {context: {internal: true}});
        });

        it('Exposes the sitekey but never the secret key', async function () {
            const {body} = await agent.get('settings/')
                .expectStatus(200);

            assert.equal(body.settings.turnstile_sitekey, 'test-sitekey');
            assert.equal('turnstile_secret_key' in body.settings, false, 'turnstile_secret_key must never be exposed publicly');
        });
    });
});
