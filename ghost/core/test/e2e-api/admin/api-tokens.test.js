const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const assert = require('assert/strict');

describe('Admin API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    function assertMatchesFixture(fixtureId, response) {
        const user = response.users[0];
        const expected = fixtureManager.get('users', fixtureId);
        assert.equal(user.name, expected.name);
        assert.equal(user.email, expected.email);
        assert.equal(user.slug, expected.slug);
    }

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
            before(async function () {
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
            before(async function () {
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
        });
    });

    // Make sure that user auth works in tests, after using a token
    describe('User Authentication', function () {
        it('can do user auth after a token is used', async function () {
            await agent.loginAsOwner();
            await agent
                .get('users/me')
                .expectStatus(200);
        });
    });

    // Make sure that staff tokens are blocked from certain endpoints
    describe('Staff Token Blocklist', function () {
        describe('DELETE /db endpoint', function () {
            it('Owner staff token should be blocked', async function () {
                await agent.useStaffTokenForOwner();
                await agent
                    .delete('db')
                    .expectStatus(403);
            });

            it('Admin staff token should be blocked', async function () {
                await agent.useStaffTokenForAdmin();
                await agent
                    .delete('db')
                    .expectStatus(403);
            });

            it('Editor staff token should be blocked', async function () {
                await agent.useStaffTokenForEditor();
                await agent
                    .delete('db')
                    .expectStatus(403);
            });

            it('Regular user authentication should work (if user has permission)', async function () {
                await agent.loginAsOwner();
                // Owner actually has permission to delete all content, so this should succeed
                // The important thing is that it's not blocked by the staff token check
                await agent
                    .delete('db')
                    .expectStatus(204); // Success - owner can delete all content
            });
        });

        describe('PUT /users/owner endpoint', function () {
            it('Owner staff token should be blocked', async function () {
                await agent.useStaffTokenForOwner();
                await agent
                    .put('users/owner')
                    .body({
                        owner: [{
                            id: fixtureManager.get('users', 1).id,
                            email: fixtureManager.get('users', 1).email
                        }]
                    })
                    .expectStatus(403)
                    .expect(({body}) => {
                        assert.equal(body.errors[0].type, 'NoPermissionError');
                        assert.equal(body.errors[0].message, 'Staff tokens are not allowed to access this endpoint');
                    });
            });

            it('Admin staff token should be blocked', async function () {
                await agent.useStaffTokenForAdmin();
                await agent
                    .put('users/owner')
                    .body({
                        owner: [{
                            id: fixtureManager.get('users', 1).id,
                            email: fixtureManager.get('users', 1).email
                        }]
                    })
                    .expectStatus(403)
                    .expect(({body}) => {
                        assert.equal(body.errors[0].type, 'NoPermissionError');
                        assert.equal(body.errors[0].message, 'Staff tokens are not allowed to access this endpoint');
                    });
            });

            it('Regular user authentication should work (if user has permission)', async function () {
                await agent.loginAsOwner();
                // Note: This will likely fail with validation or other errors, but not the staff token error
                await agent
                    .put('users/owner')
                    .body({
                        owner: [{
                            id: fixtureManager.get('users', 1).id,
                            email: fixtureManager.get('users', 1).email
                        }]
                    })
                    .expectStatus(200);
            });
        });

        describe('Other endpoints should work normally', function () {
            it('Staff tokens can still access GET /users', async function () {
                await agent.useStaffTokenForAdmin();
                await agent
                    .get('users')
                    .expectStatus(200);
            });

            it('Staff tokens can get invites, which integrations cannot', async function () {
                await agent.useStaffTokenForEditor();
                await agent
                    .get('invites')
                    .expectStatus(200);
            });

            it('Integrations still cannot access invites', async function () {
                await agent.useZapierAdminAPIKey();
                await agent
                    .get('invites')
                    .expectStatus(501);
            });
        });
    });
});
