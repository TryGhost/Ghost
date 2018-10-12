const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('Users Content API V2', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'client:trusted-domain');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('browse users', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address, status and other attrs.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url'], null, null, {public: true});

                should.exist(res.body.users[0].url);
                should.exist(url.parse(res.body.users[0].url).protocol);
                should.exist(url.parse(res.body.users[0].url).host);

                // Public api returns all users, but no status! Locked/Inactive users can still have written articles.
                models.User.findPage(Object.assign({status: 'all'}, testUtils.context.internal))
                    .then((response) => {
                        _.map(response.data, (model) => model.toJSON()).length.should.eql(7);
                        done();
                    });
            });
    });

    it('browse users: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url'], null, null, {public: true});
                done();
            });
    });

    it('browse user by slug: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url'], null, null, {public: true});
                done();
            });
    });

    it('browse user by slug: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count', 'url'], null, null, {public: true});
                done();
            });
    });

    it('browse user by id: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count', 'url'], null, null, {public: true});
                done();
            });
    });

    it('browse user with count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=count.posts&order=count.posts ASC'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count', 'url'], null, null, {public: true});

                // Each user should have the correct count
                _.find(jsonResponse.users, {slug:'joe-bloggs'}).count.posts.should.eql(4);
                _.find(jsonResponse.users, {slug:'contributor'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug:'slimer-mcectoplasm'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug:'jimothy-bogendath'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug: 'smith-wellingsworth'}).count.posts.should.eql(0);
                _.find(jsonResponse.users, {slug:'ghost'}).count.posts.should.eql(7);
                _.find(jsonResponse.users, {slug:'inactive'}).count.posts.should.eql(0);

                const ids = jsonResponse.users
                    .filter(user => (user.slug !== 'ghost'))
                    .filter(user => (user.slug !== 'inactive'))
                    .map(user=> user.id);

                ids.should.eql([
                    testUtils.DataGenerator.Content.users[1].id,
                    testUtils.DataGenerator.Content.users[2].id,
                    testUtils.DataGenerator.Content.users[3].id,
                    testUtils.DataGenerator.Content.users[7].id,
                    testUtils.DataGenerator.Content.users[0].id
                ]);

                done();
            });
    });

    it('browse user by id: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=roles'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url'], null, null, {public: true});
                done();
            });
    });

    it('browse users: post count', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count', 'url'], null, null, {public: true});
                done();
            });
    });
});
