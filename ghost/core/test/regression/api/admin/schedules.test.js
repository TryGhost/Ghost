const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const Promise = require('bluebird');
const sinon = require('sinon');
const moment = require('moment-timezone');
const SchedulingDefault = require('../../../../core/server/adapters/scheduling/scheduling-default');
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');
const testUtils = require('../../../utils');
const localUtils = require('./utils');

describe('Schedules API', function () {
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

    before(async function () {
        await localUtils.startGhost();

        request = supertest.agent(config.get('url'));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.getExistingData().users[0].id,
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'first',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.getExistingData().users[0].id,
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().subtract(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'second',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.getExistingData().users[0].id,
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(10, 'minute').toDate(),
            status: 'scheduled',
            slug: 'third',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.getExistingData().users[0].id,
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().subtract(10, 'minute').toDate(),
            status: 'scheduled',
            slug: 'fourth',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.getExistingData().users[0].id,
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'fifth',
            type: 'page',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        const result = await Promise.mapSeries(resources, function (post) {
            return models.Post.add(post, {context: {internal: true}});
        });

        result.length.should.eql(5);
    });

    describe('publish', function () {
        let token;

        before(function () {
            const schedulerKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-scheduler'}});

            token = localUtils.getValidAdminToken('/admin/', schedulerKey);
        });

        it('publishes posts', async function () {
            const res = await request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[0].id}/?token=${token}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            jsonResponse.posts[0].id.should.eql(resources[0].id);
            jsonResponse.posts[0].status.should.eql('published');
        });

        it('publishes page', async function () {
            const res = await request
                .put(localUtils.API.getApiQuery(`schedules/pages/${resources[4].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            should.exist(jsonResponse);
            jsonResponse.pages[0].id.should.eql(resources[4].id);
            jsonResponse.pages[0].status.should.eql('published');
        });

        it('no access', function () {
            const zapierKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-backup'}});
            const zapierToken = localUtils.getValidAdminToken('/admin/', zapierKey);

            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[0].id}/?token=${zapierToken}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });

        it('should fail with invalid resource type', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/this_is_invalid/${resources[0].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);
        });

        it('published_at is x seconds in past, but still in tolerance', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[1].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });

        it('not found', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[2].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404);
        });

        it('force publish', function () {
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[3].id}/?token=${token}`))
                .send({
                    force: true
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);
        });
    });
});
