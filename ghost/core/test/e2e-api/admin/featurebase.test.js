const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const configUtils = require('../../utils/config-utils');

describe('Featurebase API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    describe('As Unauthorized User', function () {
        it('Cannot fetch the featurebase token endpoint', async function () {
            await agent.get('/featurebase/token/')
                .expectStatus(403);
        });
    });

    describe('As Owner', function () {
        before(async function () {
            await agent.loginAsOwner();
        });

        describe('With Featurebase configuration', function () {
            before(async function () {
                configUtils.set('featurebase', {
                    enabled: true,
                    jwtSecret: 'test-jwt-secret-key'
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Can get a Featurebase JWT token', async function () {
                const response = await agent
                    .get('/featurebase/token/')
                    .expectStatus(200);

                assert(response.body.featurebase);
                assert(response.body.featurebase.token);
                assert.equal(typeof response.body.featurebase.token, 'string');
                assert(response.body.featurebase.token.length > 0);

                // Verify it's a valid JWT with expected structure
                const decoded = jwt.decode(response.body.featurebase.token);
                assert(typeof decoded === 'object');
                assert(decoded.name);
                assert(decoded.email);
                assert(decoded.companies);
                assert(Array.isArray(decoded.companies));
            });
        });

        describe('Without Featurebase configuration', function () {
            it('Returns error when not configured', async function () {
                await agent
                    .get('/featurebase/token/')
                    .expectStatus(422);
            });
        });

        describe('With Featurebase disabled', function () {
            before(async function () {
                configUtils.set('featurebase', {
                    enabled: false,
                    jwtSecret: 'test-jwt-secret-key'
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Returns error when disabled', async function () {
                await agent
                    .get('/featurebase/token/')
                    .expectStatus(422);
            });
        });

        describe('With Featurebase enabled but no secret', function () {
            before(async function () {
                configUtils.set('featurebase', {
                    enabled: true
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Returns error when secret is missing', async function () {
                await agent
                    .get('/featurebase/token/')
                    .expectStatus(422);
            });
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await agent.loginAsAdmin();
            configUtils.set('featurebase', {
                enabled: true,
                jwtSecret: 'test-jwt-secret-key'
            });
        });

        after(async function () {
            await configUtils.restore();
        });

        it('Can get a Featurebase JWT token', async function () {
            const response = await agent.get('/featurebase/token/').expectStatus(200);
            assert(response.body.featurebase);
            assert(response.body.featurebase.token);
        });
    });

    describe('As Editor', function () {
        before(async function () {
            await agent.loginAsEditor();
            configUtils.set('featurebase', {
                enabled: true,
                jwtSecret: 'test-jwt-secret-key'
            });
        });

        after(async function () {
            await configUtils.restore();
        });

        it('Can get a Featurebase JWT token', async function () {
            const response = await agent.get('/featurebase/token/').expectStatus(200);
            assert(response.body.featurebase);
            assert(response.body.featurebase.token);
        });
    });

    describe('As Author', function () {
        before(async function () {
            await agent.loginAsAuthor();
            configUtils.set('featurebase', {
                enabled: true,
                jwtSecret: 'test-jwt-secret-key'
            });
        });

        after(async function () {
            await configUtils.restore();
        });

        it('Can get a Featurebase JWT token', async function () {
            const response = await agent.get('/featurebase/token/').expectStatus(200);
            assert(response.body.featurebase);
            assert(response.body.featurebase.token);
        });
    });

    describe('As Contributor', function () {
        before(async function () {
            await agent.loginAsContributor();
            configUtils.set('featurebase', {
                enabled: true,
                jwtSecret: 'test-jwt-secret-key'
            });
        });

        after(async function () {
            await configUtils.restore();
        });

        it('Can get a Featurebase JWT token', async function () {
            const response = await agent.get('/featurebase/token/').expectStatus(200);
            assert(response.body.featurebase);
            assert(response.body.featurebase.token);
        });
    });
});
