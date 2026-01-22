const should = require('should');
const sinon = require('sinon');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const config = require('../../../core/shared/config');
const urlUtilsHelper = require('../../utils/url-utils');
const models = require('../../../core/server/models');

describe('Ghost Admin - Storage Adapter Switching', function () {
    let agent;
    let siteUrl;
    const cdnUrl = 'https://cdn.example.com/c/site-uuid';

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'snippets');
        await agent.loginAsOwner();
        siteUrl = config.get('url');
    });

    afterEach(async function () {
        sinon.restore();
    });

    it('Can switch storage adapter multiple times without data loss', async function () {
        const newCdnUrl = 'https://cdn.example.com/c/site-uuid-2';
        let res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        let post = res.body.posts[0];
        post.feature_image.should.equal(`${siteUrl}/content/images/feature.jpg`);
        post.lexical.should.containEql(`${siteUrl}/content/files/document.pdf`);
        post.lexical.should.containEql(`${siteUrl}/content/media/video.mp4`);

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        post.feature_image.should.equal(`${siteUrl}/content/images/feature.jpg`);
        post.lexical.should.containEql(`${cdnUrl}/content/files/document.pdf`);
        post.lexical.should.containEql(`${cdnUrl}/content/media/video.mp4`);

        sinon.restore();

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        post.feature_image.should.equal(`${siteUrl}/content/images/feature.jpg`);
        post.lexical.should.containEql(`${siteUrl}/content/files/document.pdf`);
        post.lexical.should.containEql(`${siteUrl}/content/media/video.mp4`);

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: newCdnUrl, files: newCdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        post.feature_image.should.equal(`${siteUrl}/content/images/feature.jpg`);
        post.lexical.should.containEql(`${newCdnUrl}/content/files/document.pdf`);
        post.lexical.should.containEql(`${newCdnUrl}/content/media/video.mp4`);
    });

    it('Mobiledoc posts also switch URLs correctly', async function () {
        let res = await agent
            .get('posts/slug/post-with-all-media-types-mobiledoc/?formats=mobiledoc')
            .expectStatus(200);

        let post = res.body.posts[0];
        let mobiledoc = JSON.parse(post.mobiledoc);
        mobiledoc.cards.find(c => c[0] === 'file')[1].src.should.equal(`${siteUrl}/content/files/document.pdf`);

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-mobiledoc/?formats=mobiledoc')
            .expectStatus(200);

        post = res.body.posts[0];
        mobiledoc = JSON.parse(post.mobiledoc);
        mobiledoc.cards.find(c => c[0] === 'file')[1].src.should.equal(`${cdnUrl}/content/files/document.pdf`);
        post.feature_image.should.equal(`${siteUrl}/content/images/feature.jpg`);
    });

    it('Snippets also switch URLs correctly', async function () {
        const snippet = await models.Snippet.findOne({name: 'Snippet with all media types - Mobiledoc'});
        should.exist(snippet, 'Snippet should exist');

        let res = await agent
            .get(`snippets/${snippet.id}/`)
            .expectStatus(200);

        let snippetData = res.body.snippets[0];
        snippetData.mobiledoc.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
        snippetData.mobiledoc.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
        snippetData.mobiledoc.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl}
        }, sinon);

        res = await agent
            .get(`snippets/${snippet.id}/`)
            .expectStatus(200);

        snippetData = res.body.snippets[0];
        snippetData.mobiledoc.should.containEql(`${cdnUrl}/content/files/snippet-document.pdf`);
        snippetData.mobiledoc.should.containEql(`${cdnUrl}/content/media/snippet-video.mp4`);
        snippetData.mobiledoc.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
    });
});

