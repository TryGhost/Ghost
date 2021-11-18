const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const localUtils = require('./utils');

describe('Pages API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'users:extra', 'posts');
    });

    it('Can retrieve all pages', async function () {
        const res = await request.get(localUtils.API.getApiQuery('pages/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.pages);
        localUtils.API.checkResponse(jsonResponse, 'pages');
        jsonResponse.pages.should.have.length(6);

        localUtils.API.checkResponse(jsonResponse.pages[0], 'page');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
        _.isBoolean(jsonResponse.pages[0].featured).should.eql(true);

        // Absolute urls by default
        jsonResponse.pages[0].url.should.match(new RegExp(`${config.get('url')}/p/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`));
        jsonResponse.pages[1].url.should.eql(`${config.get('url')}/contribute/`);
    });

    it('Can add a page', async function () {
        const page = {
            title: 'My Page',
            page: false,
            status: 'published',
            feature_image_alt: 'Testing feature image alt',
            feature_image_caption: 'Testing <b>feature image caption</b>'
        };

        const res = await request.post(localUtils.API.getApiQuery('pages/'))
            .set('Origin', config.get('url'))
            .send({pages: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        res.body.pages.length.should.eql(1);

        localUtils.API.checkResponse(res.body.pages[0], 'page');
        should.exist(res.headers['x-cache-invalidate']);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('pages/')}${res.body.pages[0].id}/`);

        const model = await models.Post.findOne({
            id: res.body.pages[0].id
        }, testUtils.context.internal);

        const modelJson = model.toJSON();

        modelJson.title.should.eql(page.title);
        modelJson.status.should.eql(page.status);
        modelJson.type.should.eql('page');

        modelJson.posts_meta.feature_image_alt.should.eql(page.feature_image_alt);
        modelJson.posts_meta.feature_image_caption.should.eql(page.feature_image_caption);
    });

    it('Can update a page', async function () {
        const page = {
            title: 'updated page',
            page: false
        };

        const res = await request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[5].id}/`))
            .set('Origin', config.get('url'))
            .expect(200);

        page.updated_at = res.body.pages[0].updated_at;

        const res2 = await request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .send({pages: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res2.headers['x-cache-invalidate']);
        localUtils.API.checkResponse(res2.body.pages[0], 'page');

        const model = await models.Post.findOne({
            id: res2.body.pages[0].id
        }, testUtils.context.internal);

        model.get('type').should.eql('page');
    });

    it('Can update a page with restricted access to specific tier', async function () {
        const page = {
            title: 'updated page',
            page: false
        };

        const res = await request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[5].id}/`))
            .set('Origin', config.get('url'))
            .expect(200);

        page.updated_at = res.body.pages[0].updated_at;
        page.visibility = 'filter';
        page.visibility_filter = 'product:default-product';

        const res2 = await request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .send({pages: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res2.headers['x-cache-invalidate']);
        localUtils.API.checkResponse(res2.body.pages[0], 'page', ['visibility_filter']);

        const model = await models.Post.findOne({
            id: res2.body.pages[0].id
        }, testUtils.context.internal);

        model.get('type').should.eql('page');
    });

    it('Cannot get page via posts endpoint', async function () {
        await request.get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[5].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Cannot update page via posts endpoint', async function () {
        const page = {
            title: 'fails',
            updated_at: new Date().toISOString()
        };

        await request.put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .send({posts: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Can delete a page', async function () {
        const res = await request.del(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        res.body.should.be.empty();
        res.headers['x-cache-invalidate'].should.eql('/*');
    });
});
