const assert = require('assert/strict');
const moment = require('moment');

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyUuid, anyISODateTimeWithTZ} = matchers;

const pageMatcher = {
    published_at: anyISODateTimeWithTZ,
    created_at: anyISODateTimeWithTZ,
    updated_at: anyISODateTimeWithTZ,
    uuid: anyUuid
};

describe('Pages Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
        await agent.authenticate();
    });

    it('Can request pages', async function () {
        const res = await agent.get(`pages/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                pages: new Array(5)
                    .fill(pageMatcher)
            });

        assert.equal(res.body.pages[0].slug, 'about');

        const urlParts = new URL(res.body.pages[0].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');
    });

    it('Cannot request pages with mobiledoc or lexical formats', async function () {
        await agent
            .get(`pages/?formats=mobiledoc,lexical`)
            .expectStatus(200)
            .matchBodySnapshot({
                pages: new Array(5).fill(pageMatcher)
            });
    });

    it('Can request page', async function () {
        const res = await agent.get(`pages/${fixtureManager.get('posts', 5).id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                pages: new Array(1)
                    .fill(pageMatcher)
            });

        assert.equal(res.body.pages[0].slug, fixtureManager.get('posts', 5).slug);

        const urlParts = new URL(res.body.pages[0].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');
    });

    it('Can include free and paid tiers for public post', async function () {
        const publicPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'free-to-see',
            visibility: 'public',
            published_at: moment().add(15, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(publicPost, {context: {internal: true}});

        const publicPostRes = await agent
            .get(`pages/${publicPost.id}/?include=tiers`)
            .expectStatus(200);
        const publicPostData = publicPostRes.body.pages[0];
        publicPostData.tiers.length.should.eql(2);
    });

    it('Can include free and paid tiers for members only post', async function () {
        const membersPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'thou-shalt-not-be-seen',
            visibility: 'members',
            published_at: moment().add(45, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(membersPost, {context: {internal: true}});

        const membersPostRes = await agent
            .get(`pages/${membersPost.id}/?include=tiers`)
            .expectStatus(200);
        const membersPostData = membersPostRes.body.pages[0];
        membersPostData.tiers.length.should.eql(2);
    });

    it('Can include only paid tier for paid post', async function () {
        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            type: 'page',
            slug: 'thou-shalt-be-paid-for',
            visibility: 'paid',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(paidPost, {context: {internal: true}});

        const paidPostRes = await agent
            .get(`pages/${paidPost.id}/?include=tiers`)
            .expectStatus(200);
        const paidPostData = paidPostRes.body.pages[0];
        paidPostData.tiers.length.should.eql(1);
    });

    it('Can include specific tier for page with tiers visibility', async function () {
        const res = await agent
            .get(`tiers/`)
            .expectStatus(200);

        const jsonResponse = res.body;
        const paidTier = jsonResponse.tiers.find(p => p.type === 'paid');

        const tiersPage = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-be-for-specific-tiers',
            type: 'page',
            visibility: 'tiers',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });

        tiersPage.tiers = [paidTier];

        await models.Post.add(tiersPage, {context: {internal: true}});

        const tiersPostRes = await agent
            .get(`pages/${tiersPage.id}/?include=tiers`)
            .expectStatus(200);

        const tiersPostData = tiersPostRes.body.pages[0];

        tiersPostData.tiers.length.should.eql(1);
    });
});
