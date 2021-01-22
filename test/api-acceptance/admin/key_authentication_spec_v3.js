const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Admin API key authentication', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('api_keys');
    });

    it('Can not access endpoint without a token header', async function () {
        await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });

    it('Can not access endpoint with a wrong endpoint token', async function () {
        await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('https://wrong.com')}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });

    it('Can access browse endpoint with correct token', async function () {
        await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v3/admin/')}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);
    });

    it('Can create post', async function () {
        const post = {
            title: 'Post created with api_key'
        };

        const res = await request
            .post(localUtils.API.getApiQuery('posts/?include=authors'))
            .set('Origin', config.get('url'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v3/admin/')}`)
            .send({
                posts: [post]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // falls back to owner user
        res.body.posts[0].authors.length.should.eql(1);
    });

    it('Can read users', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v3/admin/')}`)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res.body.users[0], 'user');
    });
});
