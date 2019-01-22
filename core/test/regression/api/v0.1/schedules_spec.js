const should = require('should');
const supertest = require('supertest');
const Promise = require('bluebird');
const sinon = require('sinon');
const moment = require('moment-timezone');
const testUtils = require('../../../utils/index');
const localUtils = require('./utils');
const SchedulingDefault = require('../../../../server/adapters/scheduling/SchedulingDefault');
const models = require('../../../../server/models/index');
const config = require('../../../../server/config/index');
const ghost = testUtils.startGhost;

describe('Schedules API', function () {
    const posts = [];
    let request;
    let accesstoken;
    let ghostServer;

    before(function () {
        models.init();

        // @NOTE: mock the post scheduler, otherwise it will auto publish the post
        sinon.stub(SchedulingDefault.prototype, '_pingUrl').resolves();
    });

    after(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function (token) {
                accesstoken = token;

                posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().add(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().subtract(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'second'
                }));

                posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().add(10, 'minute').toDate(),
                    status: 'scheduled',
                    slug: 'third'
                }));

                posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().subtract(10, 'minute').toDate(),
                    status: 'scheduled',
                    slug: 'fourth'
                }));

                return Promise.mapSeries(posts, function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                }).then(function (result) {
                    result.length.should.eql(4);
                });
            });
    });

    describe('publish', function () {
        it('default', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${posts[0].id}/?client_id=ghost-scheduler&client_secret=${testUtils.existingData.clients[0].secret}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    jsonResponse.posts[0].id.should.eql(posts[0].id);
                    jsonResponse.posts[0].status.should.eql('published');
                });
        });

        it('no access', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${posts[0].id}/?client_id=ghost-admin&client_secret=${testUtils.existingData.clients[0].secret}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });

        it('published_at is x seconds in past, but still in tolerance', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${posts[1].id}/?client_id=ghost-scheduler&client_secret=${testUtils.existingData.clients[0].secret}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });

        it('not found', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${posts[2].id}/?client_id=ghost-scheduler&client_secret=${testUtils.existingData.clients[0].secret}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404);
        });

        it('force publish', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${posts[3].id}/?client_id=ghost-scheduler&client_secret=${testUtils.existingData.clients[0].secret}`))
                .send({
                    force: true
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });
    });
});
