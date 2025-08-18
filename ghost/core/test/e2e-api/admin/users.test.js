const should = require('should');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyArray, anyISODateTimeWithTZ} = matchers;

const userMatcher = {
    id: anyObjectId,
    created_at: anyISODateTimeWithTZ,
    updated_at: anyISODateTimeWithTZ
};
const userMatcherWithRoles = Object.assign(
    {},
    userMatcher, {
        roles: anyArray
    }
);

describe('User API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'user:inactive', 'posts');
        await agent.loginAsOwner();
    });

    it('Can request all users ordered by id', async function () {
        // @NOTE: ASC is default
        await agent.get('users/?order=id%20DESC')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: new Array(8).fill(userMatcher)
            });
    });
    it('Can include user roles', async function () {
        await agent.get('users/?include=roles')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: new Array(8).fill(userMatcherWithRoles)
            });
    });
    it('Can paginate users', async function () {
        await agent.get('users/?page=2')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                meta: {
                    pagination: {
                        page: 2
                    }
                }
            });
    });
    // it('Can retrieve a user by id', async function () {
    // });  

    // it('Can retrieve a user by slug', async function () {
    // });

    // it('Can retrieve a user by email', async function () {
    // });

    // it('can edit a user', async function () {
    // });

    // it('can edit a user fetched from the API', async function () {
    // });

    // it('Can edit user with empty roles data and does not change the role', async function () {
    // });

    // it('Cannot edit user with invalid roles data', async function () {
    // });

    // it('Can edit user roles by name', async function () {
    // });

    // it('Does not trigger cache invalidation when a private attribute on a user has been changed', async function () {
    // });

    // it('Does trigger cache invalidation when a social link on a user has been changed', async function () {
    // });

    // it('Does not trigger cache invalidation when no attribute on a user has been changed', async function () {
    // });

    // it('Can destroy an active user and transfer posts to the owner', async function () {
    // });

    // it('Can transfer ownership to admin user', async function () {
    // });

    // it('Can change password and retain the session', async function () {
    // });

    // it('Can read the user\'s Personal Token', async function () {
    // });

    // it('Can\'t read another user\'s Personal Token', async function () {
    // });

    // it('Can re-generate the user\'s Personal Token', async function () {
    // });
});
