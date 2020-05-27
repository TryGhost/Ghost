const should = require('should');
const _ = require('lodash');
const supertest = require('supertest');
const Promise = require('bluebird');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const db = require('../../../core/server/data/db');
const models = require('../../../core/server/models');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('User API', function () {
    let inactiveUser;
    let admin;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                // create inactive user
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org', status: 'inactive'}),
                    role: testUtils.DataGenerator.Content.roles[2].name
                });
            })
            .then(function (_user) {
                inactiveUser = _user;

                // create admin user
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+admin@ghost.org', slug: 'admin'}),
                    role: testUtils.DataGenerator.Content.roles[0].name
                });
            })
            .then(function (_user) {
                admin = _user;

                // by default we login with the owner
                return localUtils.doAuth(request);
            });
    });

    it('Can request all users ordered by id', function (done) {
        // @NOTE: ASC is default
        request.get(localUtils.API.getApiQuery('users/?order=id%20DESC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

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

                // only "ghost" author has a published post
                jsonResponse.users[0].url.should.eql(`${config.get('url')}/404/`);
                jsonResponse.users[1].url.should.eql(`${config.get('url')}/404/`);
                jsonResponse.users[2].url.should.eql(`${config.get('url')}/author/ghost/`);
                jsonResponse.users[3].url.should.eql(`${config.get('url')}/404/`);

                done();
            });
    });

    it('Can include user roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/?include=roles'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.users);
                localUtils.API.checkResponse(jsonResponse, 'users');

                jsonResponse.users.should.have.length(4);
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                done();
            });
    });

    it('Can paginate users', function (done) {
        request.get(localUtils.API.getApiQuery('users/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body;
                should.equal(jsonResponse.meta.pagination.page, 2);
                done();
            });
    });

    it('Can retrieve a user by id', function (done) {
        request.get(localUtils.API.getApiQuery('users/' + testUtils.existingData.users[0].id + '/?include=roles,roles.permissions,count.posts'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.users);
                should.not.exist(jsonResponse.meta);

                jsonResponse.users.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles', 'count']);
                localUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                done();
            });
    });

    it('Can retrieve a user by slug', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/joe-bloggs/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.users);
                should.not.exist(jsonResponse.meta);

                jsonResponse.users.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                done();
            });
    });

    it('Can retrieve a user by email', function (done) {
        request.get(localUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.users);
                should.not.exist(jsonResponse.meta);

                jsonResponse.users.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                done();
            });
    });

    it('can edit a user', function (done) {
        request.put(localUtils.API.getApiQuery('users/me/'))
            .set('Origin', config.get('url'))
            .send({
                users: [{
                    website: 'http://joe-bloggs.ghost.org',
                    password: 'mynewfancypasswordwhichisnotallowed'
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const putBody = res.body;
                res.headers['x-cache-invalidate'].should.eql('/*');
                should.exist(putBody.users[0]);
                putBody.users[0].website.should.eql('http://joe-bloggs.ghost.org');
                putBody.users[0].email.should.eql('jbloggs@example.com');
                localUtils.API.checkResponse(putBody.users[0], 'user');

                should.not.exist(putBody.users[0].password);

                models.User.findOne({id: putBody.users[0].id})
                    .then((user) => {
                        return models.User.isPasswordCorrect({
                            plainPassword: 'mynewfancypasswordwhichisnotallowed',
                            hashedPassword: user.get('password')
                        });
                    })
                    .then(Promise.reject)
                    .catch((err) => {
                        err.code.should.eql('PASSWORD_INCORRECT');
                        done();
                    });
            });
    });

    it('Can destroy an active user', function () {
        const userId = testUtils.existingData.users[1].id;

        return request
            .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${userId}`))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                res.body.posts.length.should.eql(7);

                return request
                    .delete(localUtils.API.getApiQuery(`users/${userId}`))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                should.exist(res.body.meta.filename);

                return request
                    .get(localUtils.API.getApiQuery(`db/?filename=${res.body.meta.filename}/`))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`users/${userId}/`))
                    .set('Origin', config.get('url'))
                    .expect(404);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${userId}`))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                res.body.posts.length.should.eql(0);

                return db.knex('roles_users')
                    .where({
                        user_id: userId
                    })
                    .select();
            })
            .then((models) => {
                models.length.should.eql(0);

                return db.knex('roles_users')
                    .select();
            })
            .then((models) => {
                models.length.should.greaterThan(0);
            });
    });

    it('Can transfer ownership to admin user', function () {
        return request
            .put(localUtils.API.getApiQuery('users/owner'))
            .set('Origin', config.get('url'))
            .send({
                owner: [{
                    id: admin.id
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                res.body.users[0].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[0].name);
                res.body.users[1].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[3].name);
            });
    });

    it('Can change password and retain the session', async function () {
        await request
            .put(localUtils.API.getApiQuery('users/password'))
            .set('Origin', config.get('url'))
            .send({
                password: [{
                    newPassword: '1234abcde!!',
                    ne2Password: '1234abcde!!',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.existingData.users[0].id
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.exist(res.body.password);
                should.exist(res.body.password[0].message);
            });

        await request
            .get(localUtils.API.getApiQuery('session/'))
            .set('Origin', config.get('url'))
            .expect(200);
    });
});
