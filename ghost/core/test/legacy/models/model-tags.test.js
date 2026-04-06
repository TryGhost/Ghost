const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const urlUtilsHelper = require('../../utils/url-utils');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

describe('Tag Model', function () {
    const siteUrl = configUtils.config.get('url');

    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    before(testUtils.setup('users:roles', 'posts'));

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('/test-url/');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('URL transformations without CDN config', function () {
        it('transforms feature_image, og_image, and twitter_image to absolute site URLs', async function () {
            const tag = await models.Tag.findOne({slug: 'tag-with-images'});
            assertExists(tag, 'Tag with images should exist');
            assert.equal(tag.get('feature_image'), `${siteUrl}/content/images/tag-feature.jpg`);
            assert.equal(tag.get('og_image'), `${siteUrl}/content/images/tag-og.jpg`);
            assert.equal(tag.get('twitter_image'), `${siteUrl}/content/images/tag-twitter.jpg`);
        });
    });

    describe('URL transformations with CDN config', function () {
        const cdnUrl = 'https://cdn.example.com/c/site-uuid';

        beforeEach(function () {
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {
                    media: cdnUrl,
                    files: cdnUrl,
                    image: cdnUrl
                }
            }, sinon);
        });

        it('transforms feature_image, og_image, and twitter_image to CDN URLs', async function () {
            const tag = await models.Tag.findOne({slug: 'tag-with-images'});
            assertExists(tag, 'Tag with images should exist');
            assert.equal(tag.get('feature_image'), `${cdnUrl}/content/images/tag-feature.jpg`);
            assert.equal(tag.get('og_image'), `${cdnUrl}/content/images/tag-og.jpg`);
            assert.equal(tag.get('twitter_image'), `${cdnUrl}/content/images/tag-twitter.jpg`);
        });
    });
});
