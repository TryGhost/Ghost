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

    describe('User Authentication', function () {
        it('Double check we can do user auth after a token is used', async function () {
            await agent.loginAsOwner();
            await agent
                .get('users/me')
                .expectStatus(200);
        });
    });
});
