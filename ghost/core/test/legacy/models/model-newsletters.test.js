const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const urlUtilsHelper = require('../../utils/url-utils');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

describe('Newsletter Model', function () {
    const siteUrl = configUtils.config.get('url');

    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    before(testUtils.setup('users:roles', 'newsletters'));

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('/test-url/');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('URL transformations without CDN config', function () {
        it('transforms header_image to absolute site URL', async function () {
            const newsletter = await models.Newsletter.findOne({slug: 'new-newsletter'});
            assertExists(newsletter, 'New newsletter should exist');
            assert.equal(newsletter.get('header_image'), `${siteUrl}/content/images/newsletter-header.jpg`);
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

        it('transforms header_image to CDN URL', async function () {
            const newsletter = await models.Newsletter.findOne({slug: 'new-newsletter'});
            assertExists(newsletter, 'New newsletter should exist');
            assert.equal(newsletter.get('header_image'), `${cdnUrl}/content/images/newsletter-header.jpg`);
        });
    });
});
