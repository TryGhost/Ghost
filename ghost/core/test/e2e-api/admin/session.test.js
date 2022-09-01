const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, stringMatching, anyISODateTime} = matchers;

describe('Sessions API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
    });

    it('can create session (log in)', async function () {
        const owner = await fixtureManager.get('users', 0);
        await agent
            .post('session/')
            .body({
                grant_type: 'password',
                username: owner.email,
                password: owner.password
            })
            .expectStatus(201)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag,
                'set-cookie': [
                    stringMatching(/^ghost-admin-api-session=/)
                ]
            });
    });

    it('can read session now the owner is logged in', async function () {
        await agent
            .get('session/')
            .expectStatus(200)
            .matchBodySnapshot({
                // id is 1, but should be anyObjectID :(
                last_seen: anyISODateTime,
                created_at: anyISODateTime,
                updated_at: anyISODateTime
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('can delete session (log out)', async function () {
        await agent
            .delete('session/')
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('errors when reading session again now owner is not logged in', async function () {
        await agent
            .get('session/')
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
