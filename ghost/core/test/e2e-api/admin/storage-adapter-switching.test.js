const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
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
        assert.equal(post.feature_image, `${siteUrl}/content/images/feature.jpg`);
        assert(post.lexical.includes(`${siteUrl}/content/files/document.pdf`));
        assert(post.lexical.includes(`${siteUrl}/content/media/video.mp4`));

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        assert.equal(post.feature_image, `${cdnUrl}/content/images/feature.jpg`);
        assert(post.lexical.includes(`${cdnUrl}/content/files/document.pdf`));
        assert(post.lexical.includes(`${cdnUrl}/content/media/video.mp4`));

        sinon.restore();

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        assert.equal(post.feature_image, `${siteUrl}/content/images/feature.jpg`);
        assert(post.lexical.includes(`${siteUrl}/content/files/document.pdf`));
        assert(post.lexical.includes(`${siteUrl}/content/media/video.mp4`));

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: newCdnUrl, files: newCdnUrl, image: newCdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-lexical/?formats=lexical')
            .expectStatus(200);

        post = res.body.posts[0];
        assert.equal(post.feature_image, `${newCdnUrl}/content/images/feature.jpg`);
        assert(post.lexical.includes(`${newCdnUrl}/content/files/document.pdf`));
        assert(post.lexical.includes(`${newCdnUrl}/content/media/video.mp4`));
    });

    it('Mobiledoc posts also switch URLs correctly', async function () {
        let res = await agent
            .get('posts/slug/post-with-all-media-types-mobiledoc/?formats=mobiledoc')
            .expectStatus(200);

        let post = res.body.posts[0];
        let mobiledoc = JSON.parse(post.mobiledoc);
        assert.equal(mobiledoc.cards.find(c => c[0] === 'file')[1].src, `${siteUrl}/content/files/document.pdf`);

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
        }, sinon);

        res = await agent
            .get('posts/slug/post-with-all-media-types-mobiledoc/?formats=mobiledoc')
            .expectStatus(200);

        post = res.body.posts[0];
        mobiledoc = JSON.parse(post.mobiledoc);
        assert.equal(mobiledoc.cards.find(c => c[0] === 'file')[1].src, `${cdnUrl}/content/files/document.pdf`);
        assert.equal(post.feature_image, `${cdnUrl}/content/images/feature.jpg`);
    });

    it('Snippets also switch URLs correctly', async function () {
        const snippet = await models.Snippet.findOne({name: 'Snippet with all media types - Mobiledoc'});
        assertExists(snippet, 'Snippet should exist');

        let res = await agent
            .get(`snippets/${snippet.id}/`)
            .expectStatus(200);

        let snippetData = res.body.snippets[0];
        assert(snippetData.mobiledoc.includes(`${siteUrl}/content/files/snippet-document.pdf`));
        assert(snippetData.mobiledoc.includes(`${siteUrl}/content/media/snippet-video.mp4`));
        assert(snippetData.mobiledoc.includes(`${siteUrl}/content/images/snippet-inline.jpg`));

        urlUtilsHelper.stubUrlUtilsWithCdn({
            assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
        }, sinon);

        res = await agent
            .get(`snippets/${snippet.id}/`)
            .expectStatus(200);

        snippetData = res.body.snippets[0];
        assert(snippetData.mobiledoc.includes(`${cdnUrl}/content/files/snippet-document.pdf`));
        assert(snippetData.mobiledoc.includes(`${cdnUrl}/content/media/snippet-video.mp4`));
        assert(snippetData.mobiledoc.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
    });
});

