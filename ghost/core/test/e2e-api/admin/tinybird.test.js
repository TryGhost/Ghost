const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const assert = require('assert/strict');
const configUtils = require('../../utils/configUtils');

describe('Tinybird API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    describe('As Unauthorized User', function () {
        it('Cannot fetch the tinybird-token endpoint', async function () {
            await agent.get('/tinybird/token/')
                .expectStatus(403);
        });
    });

    describe('As Owner', function () {
        before(async function () {
            await agent.loginAsOwner();
        });

        describe('With Tinybird configuration', function () {
            before(async function () {
                configUtils.set('tinybird', {
                    workspaceId: 'test-workspace-id',
                    adminToken: 'test-admin-token'
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Can get a Tinybird JWT token', async function () {
                const response = await agent
                    .get('/tinybird/token/')
                    .expectStatus(200);

                assert(response.body.tinybird);
                assert(response.body.tinybird.token);
                assert.equal(typeof response.body.tinybird.token, 'string');
                assert(response.body.tinybird.token.length > 0);
            });
        });

        describe('Without Tinybird configuration', function () {
            it('Returns null token when not configured', async function () {
                const response = await agent
                    .get('/tinybird/token/')
                    .expectStatus(200);

                assert(response.body.tinybird);
                assert.equal(response.body.tinybird.token, null);
            });
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await agent.loginAsAdmin();
        });

        it('Can get a Tinybird JWT token', async function () {
            const response = await agent.get('/tinybird/token/').expectStatus(200);
            assert(response.body.tinybird);
        });
    });

    describe('As Editor', function () {
        before(async function () {
            await agent.loginAsEditor();
        });

        it('Cannot get a Tinybird JWT token', async function () {
            await agent.get('/tinybird/token/').expectStatus(403);
        });
    });
});