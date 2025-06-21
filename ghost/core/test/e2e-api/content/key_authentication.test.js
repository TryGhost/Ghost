const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyErrorId} = matchers;

describe('Content API key authentication', function () {
    describe('Unauthenticated', function () {
        let unauthenticatedAgent;

        before(async function () {
            unauthenticatedAgent = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('api_keys');
        });

        it('Can not access without key', async function () {
            await unauthenticatedAgent
                .get('posts/')
                .expectStatus(403)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });

    describe('Authenticated', function () {
        let authenticatedAgent;

        before(async function () {
            authenticatedAgent = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('api_keys');
            authenticatedAgent.authenticate();
        });

        it('Can access with with valid key', async function () {
            await authenticatedAgent
                .get('posts/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Host Settings: custom integration limits', function () {
        let limitedAgent;

        before(async function () {
            await configUtils.set('hostSettings:limits', {
                customIntegrations: {
                    disabled: true,
                    error: 'Custom limit error message'
                }
            });

            limitedAgent = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('integrations', 'api_keys');
            limitedAgent.authenticate();
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('Blocks the request when host limit is in place for custom integrations', async function () {
            await limitedAgent
                .get('posts/')
                .expectStatus(403)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        type: 'HostLimitError',
                        message: 'Custom limit error message'
                    }]
                });

            // CASE: explore endpoint can only be reached by Admin API
            await limitedAgent
                .get('explore/')
                .expectStatus(404)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        type: 'NotFoundError'
                    }]
                });
        });
    });
});
