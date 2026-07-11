const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const assert = require('node:assert/strict');
const supertest = require('supertest');

describe('Admin API', function () {
    let agent;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    /**
     * Make requests bypassing URL normalization which adds trailing slashes.
     */
    function rawRequest(method, path) {
        return supertest(agent.app)[method.toLowerCase()](path)
            .set(agent.defaults.headers);
    }

    function assertMatchesFixture(fixtureId, response) {
        const user = response.users[0];
        const expected = fixtureManager.get('users', fixtureId);
        assert.equal(user.name, expected.name);
        assert.equal(user.email, expected.email);
        assert.equal(user.slug, expected.slug);
    }

    describe('Switch Authentication Methods', function () {
        it('can use a restricted cookie session, then switch to a token', async function () {
            // editor doesn't have permission to access /members, so this should fail
            await agent.loginAsEditor();
            await agent.get('members').expectStatus(403);
            // the backup token has permission to access /members
            await agent.useBackupAdminAPIKey();
            await agent.get('members').expectStatus(200);
        });

        it('can use a restricted token, then switch to a cookie session', async function () {
            // the backup token doesn't have permission to access /users, so this should fail
            await agent.useBackupAdminAPIKey();
            await agent.get('users').expectStatus(403);
            // the admin token has permission to access /users
            await agent.loginAsAdmin();
            await agent.get('users').expectStatus(200);
        });
    });

    // The intention of these tests is to generally demonstrate that the staff token is working
    describe('Staff Tokens - Can fetch own data', function () {
        it('Owner', async function () {
            await agent.useStaffTokenForOwner();
            await agent
                .get('users/me')
                .expectStatus(200)
                .expect(({body}) => {
                    assertMatchesFixture(0, body);
                });
        });

        it('Admin', async function () {
            await agent.useStaffTokenForAdmin();
            await agent
                .get('users/me')
                .expectStatus(200)
                .expect(({body}) => {
                    assertMatchesFixture(1, body);
                });
        });

        it('Editor', async function () {
            await agent.useStaffTokenForEditor();
            await agent
                .get('users/me')
                .expectStatus(200)
                .expect(({body}) => {
                    assertMatchesFixture(2, body);
                });
        });

        it('Author', async function () {
            await agent.useStaffTokenForAuthor();
            await agent
                .get('users/me')
                .expectStatus(200)
                .expect(({body}) => {
                    assertMatchesFixture(3, body);
                });
        });

        it('Contributor', async function () {
            await agent.useStaffTokenForContributor();
            await agent
                .get('users/me')
                .expectStatus(200)
                .expect(({body}) => {
                    assertMatchesFixture(4, body);
                });
        });
    });

    // The intention of these tests is to generally demonstrate that integration tokens work with limited access
    describe('Integration Tokens', function () {
        describe('Zapier', function () {
            beforeAll(async function () {
                await agent.useZapierAdminAPIKey();
            });

            it('Request to user/me will 404 as there is no user associated with the token', async function () {
                await agent
                    .get('users/me')
                    .expectStatus(404);
            });

            it('Request to list users will succeed', async function () {
                await agent
                    .get('users')
                    .expectStatus(200);
            });
        });

        describe('Backup Integration', function () {
            beforeAll(async function () {
                await agent.useBackupAdminAPIKey();
            });

            it('Request to user/me will 403 because the backup integration has restricted permissions', async function () {
                await agent
                    .get('users/me')
                    .expectStatus(403);
            });

            it('Request to list users will also 403 due to restricted permissions', async function () {
                await agent
                    .get('users')
                    .expectStatus(403);
            });

            it('Request to list members should succeed', async function () {
                await agent
                    .get('members')
                    .expectStatus(200);
            });
        });
    });

    // The blocklist contract: each (method, path) tuple must be rejected
    // for any staff token, across lowercase, trailing-slash and mixed-case
    // variants. The middleware's role isn't to evaluate permissions here —
    // it short-circuits before that — so role doesn't change the outcome.
    describe('Staff Token Blocklist', function () {
        // Build path variants once so the parameter table reads as a contract:
        // lowercase, trailing slash, and mixed-case in the endpoint segment all
        // resolve to the same handler (Express matches case-insensitively) and
        // so must be rejected the same. The `/ghost/api/admin` prefix stays
        // lowercase because the API-key auth layer rejects mixed-case prefixes
        // at 401 (JWT audience validation) before the blocklist runs.
        const API_PREFIX = '/ghost/api/admin';
        const pathVariants = (endpoint) => {
            const base = `${API_PREFIX}${endpoint}`;
            const mixedCase = `${API_PREFIX}${endpoint.replace(/(?<=\/)[a-z]/g, c => c.toUpperCase())}`;
            return [base, `${base}/`, mixedCase];
        };

        const blockedRequests = [
            ...pathVariants('/db').map(path => ({
                label: `DELETE ${path}`,
                method: 'DELETE',
                path
            })),
            ...pathVariants('/users/owner').map(path => ({
                label: `PUT ${path}`,
                method: 'PUT',
                path,
                body: () => ({owner: [{id: fixtureManager.get('users', 1).id, email: fixtureManager.get('users', 1).email}]})
            })),
            ...pathVariants('/authentication/reset').map(path => ({
                label: `POST ${path}`,
                method: 'POST',
                path
            }))
        ];

        blockedRequests.forEach(({label, method, path, body}) => {
            it(`blocks staff token: ${label}`, async function () {
                await agent.useStaffTokenForOwner();
                const req = rawRequest(method, path);
                if (body) {
                    req.send(body());
                }
                const res = await req;
                assert.equal(res.status, 403, `Expected 403 for ${method} ${path}`);
                assert.equal(res.body.errors[0].type, 'NoPermissionError');
                assert.equal(res.body.errors[0].message, 'Staff tokens are not allowed to access this endpoint');
            });
        });

        // Control: staff tokens on a non-blocked endpoint reach the permission
        // system normally. Proves the blocklist is scoped, not global.
        it('allows staff token on a non-blocked endpoint', async function () {
            await agent.useStaffTokenForOwner();
            await agent
                .get('db')
                .expectStatus(200);
        });

        describe('Everything else should get access according to their permissions', function () {
            it('Owner staff tokens can access GET /db', async function () {
                await agent.useStaffTokenForOwner();
                await agent
                    .get('db')
                    .expectStatus(200);
            });

            it('Owner staff tokens can access GET /invites', async function () {
                await agent.useStaffTokenForOwner();
                await agent
                    .get('invites')
                    .expectStatus(200);
            });

            it('Admin staff tokens can access GET /db', async function () {
                await agent.useStaffTokenForAdmin();
                await agent
                    .get('db')
                    .expectStatus(200);
            });

            it('Admin staff tokens can access GET /invites', async function () {
                await agent.useStaffTokenForAdmin();
                await agent
                    .get('invites')
                    .expectStatus(200);
            });

            it('Editor staff tokens cannot access GET /db', async function () {
                await agent.useStaffTokenForEditor();
                await agent
                    .get('db')
                    .expectStatus(403);
            });

            it('Editor staff tokens can access GET /invites', async function () {
                await agent.useStaffTokenForEditor();
                await agent
                    .get('invites')
                    .expectStatus(200);
            });

            it('Author staff tokens cannot access GET /db', async function () {
                await agent.useStaffTokenForAuthor();
                await agent
                    .get('db')
                    .expectStatus(403);
            });

            it('Author staff tokens cannot access GET /invites', async function () {
                await agent.useStaffTokenForAuthor();
                await agent
                    .get('invites')
                    .expectStatus(403);
            });

            it('Contributor staff tokens cannot access GET /db', async function () {
                await agent.useStaffTokenForContributor();
                await agent
                    .get('db')
                    .expectStatus(403);
            });

            it('Contributor staff tokens cannot access GET /invites', async function () {
                await agent.useStaffTokenForContributor();
                await agent
                    .get('invites')
                    .expectStatus(403);
            });

            it('Integrations cannot access GET /db', async function () {
                await agent.useZapierAdminAPIKey();
                await agent
                    .get('db')
                    .expectStatus(403);
            });

            it('Integrations cannot access GET /invites', async function () {
                await agent.useZapierAdminAPIKey();
                await agent
                    .get('invites')
                    .expectStatus(403);
            });
        });
    });
});
