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

            it('Request to list members should succeed', async function () {
                await agent
                    .get('members')
                    .expectStatus(200);
            });
        });
    });

    // Make sure that staff tokens are blocked from certain endpoints
    describe('Staff Token Blocklist', function () {
        describe('DELETE /db endpoint (delete all content)', function () {
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

        describe('PUT /users/owner endpoint (transfer ownership)', function () {
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
