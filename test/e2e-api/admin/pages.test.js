const should = require('should');
const supertest = require('supertest');
const moment = require('moment');
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

    it('Can include free and paid tiers for public page', async function () {
        const publicPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'free-to-see',
            visibility: 'public',
            published_at: moment().add(15, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(publicPost, {context: {internal: true}});

        const publicPostRes = await request
            .get(localUtils.API.getApiQuery(`pages/${publicPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const publicPostData = publicPostRes.body.pages[0];
        publicPostData.tiers.length.should.eql(2);
    });

    it('Can include free and paid tiers for members only page', async function () {
        const membersPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'thou-shalt-not-be-seen',
            visibility: 'members',
            published_at: moment().add(45, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(membersPost, {context: {internal: true}});

        const membersPostRes = await request
            .get(localUtils.API.getApiQuery(`pages/${membersPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const membersPostData = membersPostRes.body.pages[0];
        membersPostData.tiers.length.should.eql(2);
    });

    it('Can include only paid tier for paid page', async function () {
        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'thou-shalt-be-paid-for',
            visibility: 'paid',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(paidPost, {context: {internal: true}});

        const paidPostRes = await request
            .get(localUtils.API.getApiQuery(`pages/${paidPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const paidPostData = paidPostRes.body.pages[0];
        paidPostData.tiers.length.should.eql(1);
    });

    it('Can include specific tier for page with tiers visibility', async function () {
        const res = await request.get(localUtils.API.getApiQuery('tiers/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;

        const paidTier = jsonResponse.tiers.find(p => p.type === 'paid');

        const tiersPage = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'thou-shalt-be-for-specific-tiers',
            visibility: 'tiers',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });

        tiersPage.tiers = [paidTier];

        await models.Post.add(tiersPage, {context: {internal: true}});

        const tiersPageRes = await request
            .get(localUtils.API.getApiQuery(`pages/${tiersPage.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const tiersPageData = tiersPageRes.body.pages[0];

        tiersPageData.tiers.length.should.eql(1);
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

        const resTiers = await request
            .get(localUtils.API.getApiQuery(`tiers/`))
            .set('Origin', config.get('url'))
            .expect(200);

        const tiers = resTiers.body.tiers;
        page.updated_at = res.body.pages[0].updated_at;
        page.visibility = 'tiers';
        const paidTiers = tiers.filter((p) => {
            return p.type === 'paid';
        }).map((product) => {
            return product;
        });
        page.tiers = paidTiers;

        const res2 = await request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .send({pages: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res2.headers['x-cache-invalidate']);
        localUtils.API.checkResponse(res2.body.pages[0], 'page');
        res2.body.pages[0].tiers.length.should.eql(paidTiers.length);

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
