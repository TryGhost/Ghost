const assert = require('node:assert/strict');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObject, anyObjectId, anyArray, anyISODateTime, anyString, nullable} = matchers;
const {cacheInvalidateHeaderNotSet, cacheInvalidateHeaderSetToWildcard} = assertions;
const localUtils = require('./utils');

const userMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    last_seen: nullable(anyISODateTime)
};

const userMatcherWithRoles = {
    ...userMatcher,
    roles: anyArray
};

describe('User API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'user:inactive', 'posts');
        await agent.loginAsOwner();
    });

    it('Can request all users ordered by id', async function () {
        // @NOTE: ASC is default - explicit order also helps with consistent db ordering
        await agent.get('users/?order=id%20DESC')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: new Array(8).fill(userMatcher)
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                localUtils.API.checkResponse(body, 'users');
                localUtils.API.checkResponse(body.users[0], 'user');

                // Verify we have the expected user types in descending ID order
                const userEmails = body.users.map(user => user.email);
                assert.ok(userEmails.includes('ghost-author@example.com'));
                assert.ok(userEmails.includes(fixtureManager.get('users', 1).email));

                // Verify URL structure for users with/without published posts
                body.users.forEach((user) => {
                    if (user.slug === 'ghost' || user.slug === 'joe-bloggs') {
                        assert.equal(user.url, `${config.get('url')}/author/${user.slug}/`);
                    } else {
                        assert.equal(user.url, `${config.get('url')}/404/`);
                    }
                });
            });
    });
    it('Can include user roles', async function () {
        // uses explicit order for consistent db ordering
        await agent.get('users/?include=roles&order=id%20DESC')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: new Array(8).fill(userMatcherWithRoles)
            })
            .expect(cacheInvalidateHeaderNotSet());
    });
    it('Can paginate users', async function () {
        // uses explicit order for consistent db ordering
        await agent.get('users/?page=2&limit=5&order=id%20DESC')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: new Array(3).fill(userMatcher), // 8 total users, 5 per page, so page 2 has 3
                meta: {
                    pagination: {
                        page: 2,
                        limit: 5,
                        pages: 2,
                        total: 8,
                        next: null,
                        prev: 1
                    }
                }
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.users[0].slug, 'smith-wellingsworth');
            });
    });
    it('Can retrieve a user by id', async function () {
        const userId = fixtureManager.get('users', 0).id;
        await agent.get(`users/${userId}/?include=roles,roles.permissions,count.posts`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    roles: anyArray,
                    count: {
                        posts: 10
                    }
                }]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.meta, undefined);
                localUtils.API.checkResponse(body.users[0], 'user', ['roles', 'count']);
            });
    });

    it('Can retrieve a user by slug', async function () {
        const userSlug = fixtureManager.get('users', 1).slug;
        await agent.get(`users/slug/${userSlug}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [userMatcher]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.meta, undefined);
                localUtils.API.checkResponse(body.users[0], 'user');
            });
    });

    it('Can retrieve a user by email', async function () {
        const userEmail = fixtureManager.get('users', 1).email;
        const encodedEmail = encodeURIComponent(userEmail);
        await agent.get(`users/email/${encodedEmail}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [userMatcher]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.meta, undefined);
                localUtils.API.checkResponse(body.users[0], 'user');
            });
    });

    it('can edit a user', async function () {
        const res = await agent.put('users/me/')
            .body({
                users: [{
                    website: 'http://joe-bloggs.ghost.org',
                    password: 'mynewfancypasswordwhichisnotallowed'
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(cacheInvalidateHeaderSetToWildcard())
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    website: 'http://joe-bloggs.ghost.org'
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].email, fixtureManager.get('users', 0).email);
                assert.equal(body.users[0].password, undefined);
            });

        // Verify password change was ignored
        try {
            const user = await models.User.findOne({id: res.body.users[0].id});
            await models.User.isPasswordCorrect({
                plainPassword: 'mynewfancypasswordwhichisnotallowed',
                hashedPassword: user.get('password')
            });
            assert.fail('Password should not have been changed');
        } catch (err) {
            assert.equal(err.code, 'PASSWORD_INCORRECT');
        }
    });

    it('can edit a user fetched from the API', async function () {
        const userToEditId = fixtureManager.get('users', 1).id;

        // First, fetch the user with roles
        const res = await agent.get(`users/${userToEditId}/?include=roles`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    roles: anyArray,
                    name: fixtureManager.get('users', 1).name
                }]
            });

        const jsonResponse = res.body;
        const expectedRoleName = jsonResponse.users[0].roles[0].name;

        // Modify the user data
        jsonResponse.users[0].name = 'Changed Name';

        // Send the update
        await agent.put(`users/${userToEditId}/?include=roles`)
            .body({
                users: jsonResponse.users
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(cacheInvalidateHeaderSetToWildcard())
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    roles: anyArray,
                    name: 'Changed Name'
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].roles[0].name, expectedRoleName);
            });
    });

    it('Can edit user with empty roles data and does not change the role', async function () {
        await agent.put('users/me/?include=roles')
            .body({
                users: [{
                    roles: []
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    roles: [anyObject]
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].roles[0].name, 'Owner');
            });
    });

    it('Cannot edit user with invalid roles data', async function () {
        const userId = fixtureManager.get('users', 1).id;
        await agent.put(`users/${userId}/?include=roles`)
            .body({
                users: [{
                    roles: ['Invalid Role Name']
                }]
            })
            .expectStatus(422)
            .expect(({body}) => {
                assert.ok(body.errors);
                assert.equal(body.errors.length, 1);
                assert.match(body.errors[0].message, /cannot edit user/);
            });
    });

    it('Can edit user roles by name', async function () {
        const userId = fixtureManager.get('users', 1).id;
        await agent.put(`users/${userId}/?include=roles`)
            .body({
                users: [{
                    roles: ['Administrator']
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    roles: [anyObject]
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].roles[0].name, 'Administrator');
            });
    });

    it('Does not trigger cache invalidation when a private attribute on a user has been changed', async function () {
        await agent.put('users/me/')
            .body({
                users: [{
                    comment_notifications: false
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    comment_notifications: false
                }]
            })
            .expect(cacheInvalidateHeaderNotSet());
    });

    it('Does trigger cache invalidation when a social link on a user has been changed', async function () {
        await agent.put('users/me/')
            .body({
                users: [{
                    mastodon: 'https://mastodon.social/@johnsmith'
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(cacheInvalidateHeaderSetToWildcard())
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    mastodon: 'https://mastodon.social/@johnsmith'
                }]
            });
    });

    it('Does not trigger cache invalidation when no attribute on a user has been changed', async function () {
        await agent.put('users/me/')
            .body({
                users: [{
                    facebook: null
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                users: [{
                    ...userMatcher,
                    facebook: null
                }]
            })
            .expect(cacheInvalidateHeaderNotSet());
    });

    it('Can destroy an active user and transfer posts to the owner', async function () {
        // Use slimer-mcectoplasm user (index 3) who has a post in the fixtures
        const {id: userId, slug: userSlug} = fixtureManager.get('users', 3);
        const ownerId = fixtureManager.get('users', 0).id;

        // First check the user actually has posts
        const initialPostsRes = await agent.get(`posts/?filter=authors:${userSlug}`)
            .expectStatus(200);

        // Verify the user has posts to transfer
        assert.ok(initialPostsRes.body.posts.length > 0, `User ${userSlug} should have posts to make this test meaningful`);

        // Ensure the user's posts are only authored by that user (remove any co-authors)
        const userPostIds = initialPostsRes.body.posts.map(post => post.id);

        // Remove all co-authors from the user's posts
        await db.knex('posts_authors')
            .whereIn('post_id', userPostIds)
            .andWhereNot('author_id', userId)
            .del();

        // Ensure the user is the primary author (sort_order = 0) on all their posts
        await db.knex('posts_authors')
            .whereIn('post_id', userPostIds)
            .where('author_id', userId)
            .update({sort_order: 0});

        // Check initial database state
        const ownerPostsAuthorsModels = await db.knex('posts_authors')
            .where({author_id: ownerId})
            .select();
        const initialOwnerPostCount = ownerPostsAuthorsModels.length;

        const userPostsAuthorsModels = await db.knex('posts_authors')
            .where({author_id: userId})
            .select();
        const initialUserPostCount = userPostsAuthorsModels.length;

        // Delete the user
        const deleteRes = await agent.delete(`users/${userId}/`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.ok(body.meta.filename);
            });

        // Check the backup file was created
        await agent.get(`db/?filename=${deleteRes.body.meta.filename}`)
            .expectStatus(200);

        // Verify user was deleted
        await agent.get(`users/${userId}/`)
            .expectStatus(404);

        // Check no posts are now assigned to the deleted user
        await agent.get(`posts/?filter=authors:${userSlug}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.posts.length, 0);
            });

        // Verify database cleanup
        const rolesUsersModels = await db.knex('roles_users')
            .where({user_id: userId})
            .select();
        assert.equal(rolesUsersModels.length, 0);

        const rolesUsers = await db.knex('roles_users').select();
        assert.ok(rolesUsers.length > 0);

        // Verify posts were transferred to owner
        const ownerPostsAuthorsModelsAfter = await db.knex('posts_authors')
            .where({author_id: ownerId})
            .select();

        assert.equal(ownerPostsAuthorsModelsAfter.length, initialOwnerPostCount + initialUserPostCount);

        const userPostsAuthorsModelsAfter = await db.knex('posts_authors')
            .where({author_id: userId})
            .select();
        assert.equal(userPostsAuthorsModelsAfter.length, 0);
    });

    it('Can transfer ownership to admin user', async function () {
        const originalOwnerId = fixtureManager.get('users', 0).id;
        const newOwnerId = fixtureManager.get('users', 1).id;

        await agent.put('users/owner/')
            .body({
                owner: [{
                    id: newOwnerId
                }]
            })
            .expectStatus(200)
            .matchBodySnapshot({
                users: [
                    {
                        ...userMatcher,
                        id: originalOwnerId,
                        roles: [{name: 'Administrator',
                            id: anyObjectId,
                            created_at: anyISODateTime,
                            updated_at: anyISODateTime}]
                    },
                    {
                        ...userMatcher,
                        id: newOwnerId,
                        roles: [{name: 'Owner',
                            id: anyObjectId,
                            created_at: anyISODateTime,
                            updated_at: anyISODateTime}]
                    }
                ]
            });
    });

    it('Can change password and retain the session', async function () {
        await agent.put('users/password/')
            .body({
                password: [{
                    newPassword: '1234abcde!!',
                    ne2Password: '1234abcde!!',
                    oldPassword: 'Sl1m3rson99',
                    user_id: fixtureManager.get('users', 0).id
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot()
            .expect(({body}) => {
                assert.ok(body.password);
                assert.ok(body.password[0].message);
            });

        // Verify session is still valid
        await agent.get('users/me/')
            .expectStatus(200);
    });

    it('Can read the user\'s Personal Token', async function () {
        await agent.get('users/me/token/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                apiKey: {
                    id: anyObjectId,
                    secret: anyString,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    role_id: anyObjectId,
                    user_id: anyString,
                    type: 'admin',
                    integration_id: null,
                    last_seen_at: null,
                    last_seen_version: null
                }
            })
            .expect(({body}) => {
                assert.ok(body.apiKey);
                assert.ok(body.apiKey.id);
                assert.ok(body.apiKey.secret);
            });
    });

    it('Can\'t read another user\'s Personal Token', async function () {
        // Try to access a different user's token (should be forbidden)
        const otherUser = fixtureManager.get('users', 1);

        await agent.get(`users/${otherUser.id}/token/`)
            .expectStatus(403)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    type: 'NoPermissionError',
                    message: 'You do not have permission to perform this action',
                    id: anyString,
                    code: null,
                    context: null,
                    details: null,
                    ghostErrorCode: null,
                    help: null,
                    property: null
                }]
            });
    });

    it('Can re-generate the user\'s Personal Token', async function () {
        const originalTokenRes = await agent.get('users/me/token/')
            .expectStatus(200);

        const {id: originalId, secret: originalSecret} = originalTokenRes.body.apiKey;

        const newTokenRes = await agent.put('users/me/token/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                apiKey: {
                    id: anyObjectId,
                    secret: anyString,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    role_id: anyObjectId,
                    user_id: anyString,
                    type: 'admin',
                    integration_id: null,
                    last_seen_at: null,
                    last_seen_version: null
                }
            })
            .expect(cacheInvalidateHeaderNotSet());

        const {id: newId, secret: newSecret} = newTokenRes.body.apiKey;

        assert.equal(originalId, newId, 'Token id should remain the same');
        assert.notEqual(originalSecret, newSecret, 'Token secret should have changed');
    });
});
