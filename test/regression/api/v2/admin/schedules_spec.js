const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const Promise = require('bluebird');
const sinon = require('sinon');
const moment = require('moment-timezone');
const SchedulingDefault = require('../../../../../core/server/adapters/scheduling/SchedulingDefault');
const models = require('../../../../../core/server/models/index');
const config = require('../../../../../core/shared/config/index');
const testUtils = require('../../../../utils/index');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

// TODO: Fix with token in URL
describe.skip('v2 Schedules API', function () {
    const resources = [];
    let request;

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
            .then(() => {
                request = supertest.agent(config.get('url'));
            });
    });

    before(function () {
        return ghost()
            .then(function () {
                resources.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().add(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                resources.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().subtract(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'second'
                }));

                resources.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().add(10, 'minute').toDate(),
                    status: 'scheduled',
                    slug: 'third'
                }));

                resources.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().subtract(10, 'minute').toDate(),
                    status: 'scheduled',
                    slug: 'fourth'
                }));

                resources.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.existingData.users[0].id,
                    author_id: testUtils.existingData.users[0].id,
                    published_by: testUtils.existingData.users[0].id,
                    published_at: moment().add(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'fifth',
                    type: 'page'
                }));

                return Promise.mapSeries(resources, function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                }).then(function (result) {
                    result.length.should.eql(5);
                });
            });
    });

    describe('publish', function () {
        let schedulerKey;

        before(function () {
            schedulerKey = _.find(testUtils.existingData.apiKeys, {integration: {slug: 'ghost-scheduler'}});
        });

        it('publishes posts', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[0].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    jsonResponse.posts[0].id.should.eql(resources[0].id);
                    jsonResponse.posts[0].status.should.eql('published');
                });
        });

        it('publishes page', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/pages/${resources[4].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    jsonResponse.pages[0].id.should.eql(resources[4].id);
                    jsonResponse.pages[0].status.should.eql('published');
                });
        });

        it('no access', function () {
            const zapierKey = _.find(testUtils.existingData.apiKeys, {integration: {slug: 'ghost-backup'}});
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[0].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', zapierKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });

        it('should fail with invalid resource type', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/this_is_invalid/${resources[0].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);
        });

        it('published_at is x seconds in past, but still in tolerance', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[1].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });

        it('not found', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[2].id}/`))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404);
        });

        it('force publish', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[3].id}/`))
                .send({
                    force: true
                })
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });
    });
});
