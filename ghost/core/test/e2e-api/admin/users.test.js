const should = require('should');
const supertest = require('supertest');
const Promise = require('bluebird');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const db = require('../../../core/server/data/db');
const models = require('../../../core/server/models');
const localUtils = require('./utils');

describe('User API', function () {
    let request;
    let inactiveUser;
    let admin;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));

        // create inactive user
        inactiveUser = await testUtils.createUser({
            user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org', status: 'inactive'}),
            role: testUtils.DataGenerator.Content.roles[2].name
        });

        // create admin user
        admin = await testUtils.createUser({
            user: testUtils.DataGenerator.forKnex.createUser({email: 'test+admin@ghost.org', slug: 'admin'}),
            role: testUtils.DataGenerator.Content.roles[0].name
        });

        // by default we login with the owner
        await localUtils.doAuth(request, 'posts');
    });

    it('Can request all users ordered by id', async function () {
        // @NOTE: ASC is default
        const res = await request.get(localUtils.API.getApiQuery('users/?order=id%20DESC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);

        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        localUtils.API.checkResponse(jsonResponse, 'users');

        // owner use + ghost-author user when Ghost starts
        // and two extra users, see createUser in before
        jsonResponse.users.should.have.length(4);

        localUtils.API.checkResponse(jsonResponse.users[0], 'user');

        jsonResponse.users[0].email.should.eql(admin.email);
        jsonResponse.users[0].status.should.eql(admin.status);

        jsonResponse.users[1].email.should.eql(inactiveUser.email);
        jsonResponse.users[1].status.should.eql(inactiveUser.status);

        jsonResponse.users[2].email.should.eql('ghost-author@example.com');
        jsonResponse.users[3].email.should.eql(testUtils.DataGenerator.Content.users[0].email);

        testUtils.API.isISO8601(jsonResponse.users[3].last_seen).should.be.true();
        testUtils.API.isISO8601(jsonResponse.users[3].created_at).should.be.true();
        testUtils.API.isISO8601(jsonResponse.users[3].updated_at).should.be.true();

        // only "ghost" and joe-bloggs author has a published post
        jsonResponse.users[0].url.should.eql(`${config.get('url')}/404/`);
        jsonResponse.users[1].url.should.eql(`${config.get('url')}/404/`);
        jsonResponse.users[2].url.should.eql(`${config.get('url')}/author/ghost/`);
        jsonResponse.users[3].url.should.eql(`${config.get('url')}/author/joe-bloggs/`);
    });

    it('Can include user roles', async function () {
        const res = await request.get(localUtils.API.getApiQuery('users/?include=roles'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        localUtils.API.checkResponse(jsonResponse, 'users');

        jsonResponse.users.should.have.length(4);
        localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
    });

    it('Can paginate users', async function () {
        const res = await request.get(localUtils.API.getApiQuery('users/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;
        should.equal(jsonResponse.meta.pagination.page, 2);
    });

    it('Can retrieve a user by id', async function () {
        const res = await request.get(localUtils.API.getApiQuery('users/' + testUtils.getExistingData().users[0].id + '/?include=roles,roles.permissions,count.posts'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        should.not.exist(jsonResponse.meta);

        jsonResponse.users.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles', 'count']);
        localUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);

        should.exist(jsonResponse.users[0].count.posts);
        jsonResponse.users[0].count.posts.should.equal(8);
    });

    it('Can retrieve a user by slug', async function () {
        const res = await request.get(localUtils.API.getApiQuery('users/slug/joe-bloggs/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        should.not.exist(jsonResponse.meta);

        jsonResponse.users.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
    });

    it('Can retrieve a user by email', async function () {
        const res = await request.get(localUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        should.not.exist(jsonResponse.meta);

        jsonResponse.users.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
    });

    it('can edit a user', async function () {
        const res = await request.put(localUtils.API.getApiQuery('users/me/'))
            .set('Origin', config.get('url'))
            .send({
                users: [{
                    website: 'http://joe-bloggs.ghost.org',
                    password: 'mynewfancypasswordwhichisnotallowed'
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const putBody = res.body;
        res.headers['x-cache-invalidate'].should.eql('/*');
        should.exist(putBody.users[0]);
        putBody.users[0].website.should.eql('http://joe-bloggs.ghost.org');
        putBody.users[0].email.should.eql('jbloggs@example.com');
        localUtils.API.checkResponse(putBody.users[0], 'user');

        should.not.exist(putBody.users[0].password);

        try {
            const user = await models.User.findOne({id: putBody.users[0].id});
            await models.User.isPasswordCorrect({
                plainPassword: 'mynewfancypasswordwhichisnotallowed',
                hashedPassword: user.get('password')
            });
            return Promise.reject();
        } catch (err) {
            err.code.should.eql('PASSWORD_INCORRECT');
        }
    });

    it('can edit a user fetched from the API', async function () {
        const userToEditId = testUtils.getExistingData().users[1].id;
        const res = await request
            .get(localUtils.API.getApiQuery(`users/${userToEditId}/?include=roles`))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse = res.body;
        jsonResponse.users[0].name.should.equal('Ghost');

        should.exist(jsonResponse.users[0].roles);
        jsonResponse.users[0].roles.should.have.length(1);
        jsonResponse.users[0].roles[0].name.should.equal('Contributor');

        jsonResponse.users[0].name = 'Changed Name';

        const editResponse = await request
            .put(localUtils.API.getApiQuery(`users/${userToEditId}/?include=roles`))
            .set('Origin', config.get('url'))
            .send({
                users: jsonResponse.users
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const editJSONResponse = editResponse.body;
        editJSONResponse.users[0].name.should.equal('Changed Name');

        should.exist(editJSONResponse.users[0].roles);
        editJSONResponse.users[0].roles.should.have.length(1);
        editJSONResponse.users[0].roles[0].name.should.equal('Contributor');
    });

    it('Can edit user with empty roles data and does not change the role', async function () {
        const res = await request.put(localUtils.API.getApiQuery('users/me?include=roles'))
            .set('Origin', config.get('url'))
            .send({
                users: [{
                    roles: []
                }]
            })
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        jsonResponse.users.should.have.length(1);

        should.exist(jsonResponse.users[0].roles);
        jsonResponse.users[0].roles.should.have.length(1);
        jsonResponse.users[0].roles[0].name.should.equal('Owner');
    });

    it('Cannot edit user with invalid roles data', async function () {
        const userId = testUtils.getExistingData().users[1].id;
        const res = await request.put(localUtils.API.getApiQuery(`users/${userId}?include=roles`))
            .set('Origin', config.get('url'))
            .send({
                users: [{
                    roles: ['Invalid Role Name']
                }]
            })
            .expect(422);

        const jsonResponse = res.body;
        should.exist(jsonResponse.errors);
        jsonResponse.errors.should.have.length(1);
        jsonResponse.errors[0].message.should.match(/cannot edit user/);
    });

    it('Can edit user roles by name', async function () {
        const userId = testUtils.getExistingData().users[1].id;
        const res = await request.put(localUtils.API.getApiQuery(`users/${userId}?include=roles`))
            .set('Origin', config.get('url'))
            .send({
                users: [{
                    roles: ['Administrator']
                }]
            })
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.users);
        jsonResponse.users.should.have.length(1);

        should.exist(jsonResponse.users[0].roles);
        jsonResponse.users[0].roles.should.have.length(1);
        jsonResponse.users[0].roles[0].name.should.equal('Administrator');
    });

    it('Can destroy an active user and transfer posts to the owner', async function () {
        const userId = testUtils.getExistingData().users[1].id;
        const userSlug = testUtils.getExistingData().users[1].slug;
        const ownerId = testUtils.getExistingData().users[0].id;

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/?filter=authors:${userSlug}`))
            .set('Origin', config.get('url'))
            .expect(200);

        res.body.posts.length.should.eql(7);

        const ownerPostsAuthorsModels = await db.knex('posts_authors')
            .where({
                author_id: ownerId
            })
            .select();

        // includes posts & pages
        should.equal(ownerPostsAuthorsModels.length, 8);

        const userPostsAuthorsModels = await db.knex('posts_authors')
            .where({
                author_id: userId
            })
            .select();

        // includes posts & pages
        should.equal(userPostsAuthorsModels.length, 11);

        const res2 = await request
            .delete(localUtils.API.getApiQuery(`users/${userId}`))
            .set('Origin', config.get('url'))
            .expect(200);

        should.exist(res2.body.meta.filename);

        await request
            .get(localUtils.API.getApiQuery(`db/?filename=${res2.body.meta.filename}/`))
            .set('Origin', config.get('url'))
            .expect(200);

        await request
            .get(localUtils.API.getApiQuery(`users/${userId}/`))
            .set('Origin', config.get('url'))
            .expect(404);

        const res3 = await request
            .get(localUtils.API.getApiQuery(`posts/?filter=authors:${userSlug}}`))
            .set('Origin', config.get('url'))
            .expect(200);

        res3.body.posts.length.should.eql(0);

        const rolesUsersModels = await db.knex('roles_users')
            .where({
                user_id: userId
            })
            .select();

        rolesUsersModels.length.should.eql(0);

        const rolesUsers = await db.knex('roles_users').select();
        rolesUsers.length.should.greaterThan(0);

        const ownerPostsAuthorsModelsAfter = await db.knex('posts_authors')
            .where({
                author_id: ownerId
            })
            .select();

        should.equal(ownerPostsAuthorsModelsAfter.length, 19);

        const userPostsAuthorsModelsAfter = await db.knex('posts_authors')
            .where({
                author_id: userId
            })
            .select();

        should.equal(userPostsAuthorsModelsAfter.length, 0);
    });

    it('Can transfer ownership to admin user', async function () {
        const res = await request
            .put(localUtils.API.getApiQuery('users/owner'))
            .set('Origin', config.get('url'))
            .send({
                owner: [{
                    id: admin.id
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res.body.users[0].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[0].name);
        res.body.users[1].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[3].name);
    });

    it('Can change password and retain the session', async function () {
        let res = await request
            .put(localUtils.API.getApiQuery('users/password'))
            .set('Origin', config.get('url'))
            .send({
                password: [{
                    newPassword: '1234abcde!!',
                    ne2Password: '1234abcde!!',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.getExistingData().users[0].id
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res.body.password);
        should.exist(res.body.password[0].message);

        await request
            .get(localUtils.API.getApiQuery('session/'))
            .set('Origin', config.get('url'))
            .expect(200);
    });

    it('Can read the user\'s Personal Token', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('users/me/token/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res.body.apiKey);
        should.exist(res.body.apiKey.id);
        should.exist(res.body.apiKey.secret);
    });

    it('Can\'t read another user\'s Personal Token', async function () {
        const userNotAdmin = testUtils.getExistingData().users.find(user => user.email === 'ghost-author@example.com');
        const res = await request
            .get(localUtils.API.getApiQuery('users/' + userNotAdmin.id + '/token/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);

        should.exist(res.body.errors);
    });

    it('Can re-generate the user\'s Personal Token', async function () {
        const {body: {apiKey: {id, secret}}} = await request
            .get(localUtils.API.getApiQuery('users/me/token/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const res = await request
            .put(localUtils.API.getApiQuery('users/me/token'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res.body.apiKey);
        should.exist(res.body.apiKey.id);
        should.exist(res.body.apiKey.secret);
        should.not.exist(res.headers['x-cache-invalidate']);

        should(res.body.id).not.be.equal(id);
        should(res.body.secret).not.be.equal(secret);
    });
});
