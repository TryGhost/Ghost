const should = require('should');
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

    // @NOTE: This test runs a little slower, because we store Dates without milliseconds.
    it('Can request actions for resource', async function () {
        let postUpdatedAt;

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
            .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res2.body, 'actions');
        localUtils.API.checkResponse(res2.body.actions[0], 'action');

        res2.body.actions.length.should.eql(1);

        res2.body.actions[0].resource_type.should.eql('post');
        res2.body.actions[0].actor_type.should.eql('user');
        res2.body.actions[0].event.should.eql('added');
        Object.keys(res2.body.actions[0].actor).length.should.eql(4);
        res2.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.users[0].id);
        res2.body.actions[0].actor.image.should.eql(testUtils.DataGenerator.Content.users[0].profile_image);
        res2.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.users[0].name);
        res2.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.users[0].slug);

        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });

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
            .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res4.body, 'actions');
        localUtils.API.checkResponse(res4.body.actions[0], 'action');

        res4.body.actions.length.should.eql(2);

        res4.body.actions[0].resource_type.should.eql('post');
        res4.body.actions[0].actor_type.should.eql('user');
        res4.body.actions[0].event.should.eql('edited');
        Object.keys(res4.body.actions[0].actor).length.should.eql(4);
        res4.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.users[0].id);
        res4.body.actions[0].actor.image.should.eql(testUtils.DataGenerator.Content.users[0].profile_image);
        res4.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.users[0].name);
        res4.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.users[0].slug);

        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });

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
            .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res5.body, 'actions');
        localUtils.API.checkResponse(res5.body.actions[0], 'action');

        res5.body.actions.length.should.eql(3);

        res5.body.actions[0].resource_type.should.eql('post');
        res5.body.actions[0].actor_type.should.eql('integration');
        res5.body.actions[0].event.should.eql('edited');
        Object.keys(res5.body.actions[0].actor).length.should.eql(4);
        res5.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.integrations[0].id);
        should.equal(res5.body.actions[0].actor.image, null);
        res5.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.integrations[0].name);
        res5.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.integrations[0].slug);
    });
});
