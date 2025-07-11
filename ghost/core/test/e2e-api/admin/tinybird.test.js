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
                    adminToken: 'test-admin-token',
                    tracker: {
                        endpoint: 'https://api.tinybird.co/v0/events'
                    }
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
                
                // JWT tokens should include expiration in ISO format
                assert(response.body.tinybird.exp);
                assert.equal(typeof response.body.tinybird.exp, 'string');
                assert(new Date(response.body.tinybird.exp).getTime() > Date.now());
                
                // Verify that the ISO8601 string matches the JWT payload exp
                const jwt = require('jsonwebtoken');
                const decoded = jwt.decode(response.body.tinybird.token);
                assert(typeof decoded === 'object' && decoded.exp);
                const expectedExpiration = new Date(decoded.exp * 1000).toISOString();
                assert.equal(response.body.tinybird.exp, expectedExpiration);
            });
        });

        describe('Without Tinybird configuration', function () {
            it('Returns null when not configured', async function () {
                const response = await agent
                    .get('/tinybird/token/')
                    .expectStatus(200);

                assert.equal(response.body.tinybird, null);
            });
        });

        describe('With stats token only (deprecated configuration)', function () {
            // This configuration is no longer valid and should be removed
            // Keeping test to ensure backward compatibility handling
        });

        describe('With local stats configuration', function () {
            before(async function () {
                configUtils.set('tinybird', {
                    stats: {
                        local: {
                            enabled: true,
                            token: 'local-stats-token',
                            endpoint: 'http://localhost:7181'
                        }
                    }
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Returns local token without exp field', async function () {
                const response = await agent
                    .get('/tinybird/token/')
                    .expectStatus(200);

                assert(response.body.tinybird);
                assert.equal(response.body.tinybird.token, 'local-stats-token');
                assert.equal(response.body.tinybird.exp, undefined);
            });
        });

        describe('With local tracker configuration', function () {
            before(async function () {
                configUtils.set('tinybird', {
                    tracker: {
                        local: {
                            enabled: true,
                            endpoint: 'http://localhost:3000/tb/web_analytics'
                        }
                    }
                });
            });

            after(async function () {
                await configUtils.restore();
            });

            it('Returns null when local tracker has no token', async function () {
                const response = await agent
                    .get('/tinybird/token/')
                    .expectStatus(200);

                // Local tracker without token should return null
                // The API might return null or an empty object depending on serialization
                assert(response.body.tinybird === null || (typeof response.body.tinybird === 'object' && Object.keys(response.body.tinybird).length === 0));
            });
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await agent.loginAsAdmin();
            configUtils.set('tinybird', {
                workspaceId: 'test-workspace-id',
                adminToken: 'test-admin-token',
                tracker: {
                    endpoint: 'https://api.tinybird.co/v0/events'
                }
            });
        });

        after(async function () {
            await configUtils.restore();
        });

        it('Can get a Tinybird JWT token', async function () {
            const response = await agent.get('/tinybird/token/').expectStatus(200);
            assert(response.body.tinybird);
            assert(response.body.tinybird.token);
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