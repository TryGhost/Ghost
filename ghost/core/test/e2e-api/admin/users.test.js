const assert = require('assert/strict');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyArray, anyISODateTime, nullable} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;
const localUtils = require('./utils');

const userMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    last_seen: nullable(anyISODateTime)
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
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                localUtils.API.checkResponse(body, 'users');
                localUtils.API.checkResponse(body.users[0], 'user');
                
                // Verify we have the expected user types in descending ID order
                const userEmails = body.users.map(user => user.email);
                assert.ok(userEmails.includes('ghost-author@example.com'));
                assert.ok(userEmails.includes(testUtils.DataGenerator.Content.users[0].email));

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
        await agent.get('users/?include=roles')
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
        await agent.get('users/?page=2&limit=5')
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
            .expect(cacheInvalidateHeaderNotSet());
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    roles: anyArray,
                    count: {
                        posts: 8
                    }
                }]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.meta, undefined);
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
                etag: anyEtag,
                'x-cache-invalidate': '/*'
            })
            .matchBodySnapshot({
                users: [{
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    website: 'http://joe-bloggs.ghost.org'
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].email, fixtureManager.get('users', 0).email);
                assert.equal(body.users[0].password, undefined);
            });

        // Verify password change was ignored for security
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
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
                etag: anyEtag,
                'x-cache-invalidate': '/*'
            })
            .matchBodySnapshot({
                users: [{
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    roles: anyArray,
                    name: 'Changed Name'
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].roles[0].name, expectedRoleName);
            });
    });

    it('Can edit user with empty roles data and does not change the role', async function () {
        await agent.put('users/me?include=roles')
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    roles: anyArray
                }]
            })
            .expect(({body}) => {
                assert.equal(body.users[0].roles[0].name, 'Owner'); // Owner role should be preserved despite empty roles array
            });
    });

    it('Cannot edit user with invalid roles data', async function () {
        const userId = fixtureManager.get('users', 1).id;
        await agent.put(`users/${userId}?include=roles`)
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
        await agent.put(`users/${userId}?include=roles`)
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    roles: anyArray
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
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
                etag: anyEtag,
                'x-cache-invalidate': '/*'
            })
            .matchBodySnapshot({
                users: [{
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
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
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    last_seen: nullable(anyISODateTime),
                    facebook: null
                }]
            })
            .expect(cacheInvalidateHeaderNotSet());
    });

    // it('Can destroy an active user and transfer posts to the owner', async function () {
    //     const userId = testUtils.getExistingData().users[1].id;
    //     const userSlug = testUtils.getExistingData().users[1].slug;
    //     const ownerId = testUtils.getExistingData().users[0].id;

    //     const res = await request
    //         .get(localUtils.API.getApiQuery(`posts/?filter=authors:${userSlug}`))
    //         .set('Origin', config.get('url'))
    //         .expect(200);

    //     res.body.posts.length.should.eql(7);

    //     const ownerPostsAuthorsModels = await db.knex('posts_authors')
    //         .where({
    //             author_id: ownerId
    //         })
    //         .select();

    //     // includes posts & pages
    //     should.equal(ownerPostsAuthorsModels.length, 8);

    //     const userPostsAuthorsModels = await db.knex('posts_authors')
    //         .where({
    //             author_id: userId
    //         })
    //         .select();

    //     // includes posts & pages
    //     should.equal(userPostsAuthorsModels.length, 11);

    //     const res2 = await request
    //         .delete(localUtils.API.getApiQuery(`users/${userId}`))
    //         .set('Origin', config.get('url'))
    //         .expect(200);

    //     should.exist(res2.body.meta.filename);

    //     await request
    //         .get(localUtils.API.getApiQuery(`db/?filename=${res2.body.meta.filename}/`))
    //         .set('Origin', config.get('url'))
    //         .expect(200);

    //     await request
    //         .get(localUtils.API.getApiQuery(`users/${userId}/`))
    //         .set('Origin', config.get('url'))
    //         .expect(404);

    //     const res3 = await request
    //         .get(localUtils.API.getApiQuery(`posts/?filter=authors:${userSlug}}`))
    //         .set('Origin', config.get('url'))
    //         .expect(200);

    //     res3.body.posts.length.should.eql(0);

    //     const rolesUsersModels = await db.knex('roles_users')
    //         .where({
    //             user_id: userId
    //         })
    //         .select();

    //     rolesUsersModels.length.should.eql(0);

    //     const rolesUsers = await db.knex('roles_users').select();
    //     rolesUsers.length.should.greaterThan(0);

    //     const ownerPostsAuthorsModelsAfter = await db.knex('posts_authors')
    //         .where({
    //             author_id: ownerId
    //         })
    //         .select();

    //     should.equal(ownerPostsAuthorsModelsAfter.length, 19);

    //     const userPostsAuthorsModelsAfter = await db.knex('posts_authors')
    //         .where({
    //             author_id: userId
    //         })
    //         .select();

    //     should.equal(userPostsAuthorsModelsAfter.length, 0);
    // });

    // it('Can transfer ownership to admin user', async function () {
    //     const res = await request
    //         .put(localUtils.API.getApiQuery('users/owner'))
    //         .set('Origin', config.get('url'))
    //         .send({
    //             owner: [{
    //                 id: admin.id
    //             }]
    //         })
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .expect(200);

    //     res.body.users[0].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[0].name);
    //     res.body.users[1].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[3].name);
    // });

    // it('Can change password and retain the session', async function () {
    //     let res = await request
    //         .put(localUtils.API.getApiQuery('users/password'))
    //         .set('Origin', config.get('url'))
    //         .send({
    //             password: [{
    //                 newPassword: '1234abcde!!',
    //                 ne2Password: '1234abcde!!',
    //                 oldPassword: 'Sl1m3rson99',
    //                 user_id: testUtils.getExistingData().users[0].id
    //             }]
    //         })
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .expect(200);

    //     should.exist(res.body.password);
    //     should.exist(res.body.password[0].message);

    //     await request
    //         .get(localUtils.API.getApiQuery('users/me/'))
    //         .set('Origin', config.get('url'))
    //         .expect(200);
    // });

    // it('Can read the user\'s Personal Token', async function () {
    //     const res = await request
    //         .get(localUtils.API.getApiQuery('users/me/token/'))
    //         .set('Origin', config.get('url'))
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .expect(200);

    //     should.exist(res.body.apiKey);
    //     should.exist(res.body.apiKey.id);
    //     should.exist(res.body.apiKey.secret);
    // });

    // it('Can\'t read another user\'s Personal Token', async function () {
    //     const userNotAdmin = testUtils.getExistingData().users.find(user => user.email === 'ghost-author@example.com');
    //     const res = await request
    //         .get(localUtils.API.getApiQuery('users/' + userNotAdmin.id + '/token/'))
    //         .set('Origin', config.get('url'))
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .expect(403);

    //     should.exist(res.body.errors);
    // });

    // it('Can re-generate the user\'s Personal Token', async function () {
    //     const {body: {apiKey: {id, secret}}} = await request
    //         .get(localUtils.API.getApiQuery('users/me/token/'))
    //         .set('Origin', config.get('url'))
    //         .expect(200);

    //     const res = await request
    //         .put(localUtils.API.getApiQuery('users/me/token'))
    //         .set('Origin', config.get('url'))
    //         .expect('Content-Type', /json/)
    //         .expect('Cache-Control', testUtils.cacheRules.private)
    //         .expect(200);

    //     should.exist(res.body.apiKey);
    //     should.exist(res.body.apiKey.id);
    //     should.exist(res.body.apiKey.secret);
    //     should.not.exist(res.headers['x-cache-invalidate']);

    //     should(res.body.id).not.be.equal(id);
    //     should(res.body.secret).not.be.equal(secret);
    // });
});
