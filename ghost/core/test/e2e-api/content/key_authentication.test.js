const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyErrorId} = matchers;

describe('Content API key authentication', function () {
    before(async function () {
        // Need to ensure Ghost is started before initializing fixtures
        await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
    });

    it('Can not access without key', async function () {
        // Create a new agent without authentication
        const unauthenticatedAgent = await agentProvider.getContentAPIAgent();

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

    it('Can access with with valid key', async function () {
        // Create a new authenticated agent
        const authenticatedAgent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
        authenticatedAgent.authenticate();

        await authenticatedAgent
            .get('posts/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('Host Settings: custom integration limits', function () {
        afterEach(async function () {
            await configUtils.restore();
        });

        it('Blocks the request when host limit is in place for custom integrations', async function () {
            configUtils.set('hostSettings:limits', {
                customIntegrations: {
                    disabled: true,
                    error: 'Custom limit error message'
                }
            });

            // Need to create a new agent after changing config
            const limitedAgent = await agentProvider.getContentAPIAgent();
            await fixtureManager.init('integrations', 'api_keys');

            limitedAgent.authenticate();

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
