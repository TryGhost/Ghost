const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const _ = require('lodash');
const supertest = require('supertest');
const sinon = require('sinon');
const moment = require('moment-timezone');
const SchedulingDefault = require('../../../../core/server/adapters/scheduling/scheduling-default').default;
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');
const testUtils = require('../../../utils');
const localUtils = require('./utils');

describe('Schedules API', function () {
    const resources = [];
    let request;

    beforeAll(function () {
        // @NOTE: mock the post scheduler, otherwise it will auto publish the post
        sinon.stub(SchedulingDefault.prototype, '_pingUrl').resolves();
    });

    afterAll(function () {
        sinon.restore();
    });

    beforeAll(async function () {
        await localUtils.startGhost();

        request = supertest.agent(config.get('url'));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'first',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().subtract(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'second',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(10, 'minute').toDate(),
            status: 'scheduled',
            slug: 'third',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().subtract(10, 'minute').toDate(),
            status: 'scheduled',
            slug: 'fourth',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        resources.push(testUtils.DataGenerator.forKnex.createPost({
            published_by: testUtils.getExistingData().users[0].id,
            published_at: moment().add(30, 'seconds').toDate(),
            status: 'scheduled',
            slug: 'fifth',
            type: 'page',
            authors: [{
                id: testUtils.getExistingData().users[0].id
            }]
        }));

        const result = await Promise.all(resources.map((post) => {
            return models.Post.add(post, {context: {internal: true}});
        }));

        assert.equal(result.length, 5);
    });

    describe('publish', function () {
        let token;

        beforeAll(function () {
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

            assertExists(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assert.equal(jsonResponse.posts[0].id, resources[0].id);
            assert.equal(jsonResponse.posts[0].status, 'published');
        });

        it('publishes page', async function () {
            const res = await request
                .put(localUtils.API.getApiQuery(`schedules/pages/${resources[4].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assertExists(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assert.equal(jsonResponse.pages[0].id, resources[4].id);
            assert.equal(jsonResponse.pages[0].status, 'published');
        });

        it('no access', function () {
            // Also guards the missing-resource tolerance in the `permissions`
            // handler: this key lacks publish permission and the post exists, so
            // it must get a 403 — proving only NotFoundError is swallowed there,
            // never NoPermissionError.
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

        it('firing ahead of the scheduled time is a no-op, not an error', async function () {
            // resources[2] is scheduled 10 minutes out, beyond tolerance.
            const res = await request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[2].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assert.deepEqual(res.body.posts, []);
        });

        it('firing well after the scheduled time without force stays an error', function () {
            // resources[3] is scheduled 10 minutes in the past, beyond tolerance.
            return request
                .put(localUtils.API.getApiQuery(`schedules/posts/${resources[3].id}/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404);
        });

        it('a deleted resource is a no-op, not an error', async function () {
            // A scheduler that can't invalidate its jobs may fire one for a post
            // that has since been deleted. That should be a 2xx no-op it won't
            // retry, not a 404. (The id below is well-formed but does not exist.)
            const res = await request
                .put(localUtils.API.getApiQuery(`schedules/posts/619000000000000000000000/?token=${token}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assert.deepEqual(res.body.posts, []);
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
