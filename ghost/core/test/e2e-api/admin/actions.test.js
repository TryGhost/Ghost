const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

describe('Actions API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'integrations', 'api_keys');
    });

    after(async function () {
        sinon.restore();
    });

    // @NOTE: This test runs a little slower, because we store Dates without milliseconds.
    it('Can request actions for resource', async function () {
        let postUpdatedAt;

        const clock = sinon.useFakeTimers(Date.now());

        const res = await request
            .post(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .send({
                posts: [{
                    title: 'test post'
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const postId = res.body.posts[0].id;
        postUpdatedAt = res.body.posts[0].updated_at;

        const res2 = await request
            .get(localUtils.API.getApiQuery(`actions/?filter=${encodeURIComponent(`resource_id:'${postId}'`)}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res2.body, 'actions');
        localUtils.API.checkResponse(res2.body.actions[0], 'action');

        assert.equal(res2.body.actions.length, 1);

        assert.equal(res2.body.actions[0].resource_type, 'post');
        assert.equal(res2.body.actions[0].actor_type, 'user');
        assert.equal(res2.body.actions[0].event, 'added');
        assert.equal(Object.keys(res2.body.actions[0].actor).length, 4);
        assert.equal(res2.body.actions[0].actor.id, testUtils.DataGenerator.Content.users[0].id);
        assert.equal(res2.body.actions[0].actor.image, testUtils.DataGenerator.Content.users[0].profile_image);
        assert.equal(res2.body.actions[0].actor.name, testUtils.DataGenerator.Content.users[0].name);
        assert.equal(res2.body.actions[0].actor.slug, testUtils.DataGenerator.Content.users[0].slug);

        clock.tick(1000);

        const res3 = await request
            .put(localUtils.API.getApiQuery(`posts/${postId}/`))
            .set('Origin', config.get('url'))
            .send({
                posts: [{
                    slug: 'new-slug',
                    updated_at: postUpdatedAt
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        postUpdatedAt = res3.body.posts[0].updated_at;

        const res4 = await request
            .get(localUtils.API.getApiQuery(`actions/?filter=${encodeURIComponent(`resource_id:'${postId}'`)}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res4.body, 'actions');
        localUtils.API.checkResponse(res4.body.actions[0], 'action');

        assert.equal(res4.body.actions.length, 2);

        assert.equal(res4.body.actions[0].resource_type, 'post');
        assert.equal(res4.body.actions[0].actor_type, 'user');
        assert.equal(res4.body.actions[0].event, 'edited');
        assert.equal(Object.keys(res4.body.actions[0].actor).length, 4);
        assert.equal(res4.body.actions[0].actor.id, testUtils.DataGenerator.Content.users[0].id);
        assert.equal(res4.body.actions[0].actor.image, testUtils.DataGenerator.Content.users[0].profile_image);
        assert.equal(res4.body.actions[0].actor.name, testUtils.DataGenerator.Content.users[0].name);
        assert.equal(res4.body.actions[0].actor.slug, testUtils.DataGenerator.Content.users[0].slug);

        clock.tick(1000);

        const integrationRequest = supertest.agent(config.get('url'));
        await integrationRequest
            .put(localUtils.API.getApiQuery(`posts/${postId}/`))
            .set('Origin', config.get('url'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
            .send({
                posts: [{
                    featured: true,
                    updated_at: postUpdatedAt
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const res5 = await request
            .get(localUtils.API.getApiQuery(`actions/?filter=${encodeURIComponent(`resource_id:'${postId}'`)}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res5.body, 'actions');
        localUtils.API.checkResponse(res5.body.actions[0], 'action');

        assert.equal(res5.body.actions.length, 3);

        assert.equal(res5.body.actions[0].resource_type, 'post');
        assert.equal(res5.body.actions[0].actor_type, 'integration');
        assert.equal(res5.body.actions[0].event, 'edited');
        assert.equal(Object.keys(res5.body.actions[0].actor).length, 4);
        assert.equal(res5.body.actions[0].actor.id, testUtils.DataGenerator.Content.integrations[0].id);
        assert.equal(res5.body.actions[0].actor.image, null);
        assert.equal(res5.body.actions[0].actor.name, testUtils.DataGenerator.Content.integrations[0].name);
        assert.equal(res5.body.actions[0].actor.slug, testUtils.DataGenerator.Content.integrations[0].slug);
    });
});
