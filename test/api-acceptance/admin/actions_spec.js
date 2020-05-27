const should = require('should');
const Promise = require('bluebird');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const ghost = testUtils.startGhost;

let request;

describe('Actions API', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'integrations', 'api_keys');
            });
    });

    // @NOTE: This test runs a little slower, because we store Dates without milliseconds.
    it('Can request actions for resource', function () {
        let postId;
        let postUpdatedAt;

        return request
            .post(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .send({
                posts: [{
                    title: 'test post'
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                postId = res.body.posts[0].id;
                postUpdatedAt = res.body.posts[0].updated_at;
                return request
                    .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                localUtils.API.checkResponse(res.body, 'actions');
                localUtils.API.checkResponse(res.body.actions[0], 'action');

                res.body.actions.length.should.eql(1);

                res.body.actions[0].resource_type.should.eql('post');
                res.body.actions[0].actor_type.should.eql('user');
                res.body.actions[0].event.should.eql('added');
                Object.keys(res.body.actions[0].actor).length.should.eql(4);
                res.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.users[0].id);
                res.body.actions[0].actor.image.should.eql(testUtils.DataGenerator.Content.users[0].profile_image);
                res.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.users[0].name);
                res.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.users[0].slug);

                return Promise.delay(1000);
            })
            .then(() => {
                return request
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
            })
            .then((res) => {
                postUpdatedAt = res.body.posts[0].updated_at;

                return request
                    .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                localUtils.API.checkResponse(res.body, 'actions');
                localUtils.API.checkResponse(res.body.actions[0], 'action');

                res.body.actions.length.should.eql(2);

                res.body.actions[0].resource_type.should.eql('post');
                res.body.actions[0].actor_type.should.eql('user');
                res.body.actions[0].event.should.eql('edited');
                Object.keys(res.body.actions[0].actor).length.should.eql(4);
                res.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.users[0].id);
                res.body.actions[0].actor.image.should.eql(testUtils.DataGenerator.Content.users[0].profile_image);
                res.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.users[0].name);
                res.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.users[0].slug);

                return Promise.delay(1000);
            })
            .then(() => {
                const integrationRequest = supertest.agent(config.get('url'));

                return integrationRequest
                    .put(localUtils.API.getApiQuery(`posts/${postId}/`))
                    .set('Origin', config.get('url'))
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/canary/admin/')}`)
                    .send({
                        posts: [{
                            featured: true,
                            updated_at: postUpdatedAt
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery(`actions/?filter=resource_id:${postId}&include=actor`))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                localUtils.API.checkResponse(res.body, 'actions');
                localUtils.API.checkResponse(res.body.actions[0], 'action');

                res.body.actions.length.should.eql(3);

                res.body.actions[0].resource_type.should.eql('post');
                res.body.actions[0].actor_type.should.eql('integration');
                res.body.actions[0].event.should.eql('edited');
                Object.keys(res.body.actions[0].actor).length.should.eql(4);
                res.body.actions[0].actor.id.should.eql(testUtils.DataGenerator.Content.integrations[0].id);
                should.equal(res.body.actions[0].actor.image, null);
                res.body.actions[0].actor.name.should.eql(testUtils.DataGenerator.Content.integrations[0].name);
                res.body.actions[0].actor.slug.should.eql(testUtils.DataGenerator.Content.integrations[0].slug);
            });
    });
});
