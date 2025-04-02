const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyContentLength, anyContentVersion} = matchers;
const configUtils = require('../../utils/configUtils');

const settingsMatcher = {
    version: matchers.anyString,
    labs: matchers.anyObject
};

describe('Settings Content API', function () {
    let agent;

    before(async function () {
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

    describe('Captcha settings', function () {
        beforeEach(function () {
            configUtils.set('captcha', {
                enabled: true,
                siteKey: 'testkey'
            });
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('Can request captcha settings', async function () {
            await agent.get('settings/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength
                })
                .matchBodySnapshot({
                    settings: Object.assign({}, settingsMatcher, {
                        captcha_sitekey: 'testkey'
                    })
                });
        });
    });
});
