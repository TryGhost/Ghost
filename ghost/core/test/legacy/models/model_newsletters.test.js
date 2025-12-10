const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

describe('Newsletter Model', function () {
    const siteUrl = 'http://127.0.0.1:2369';

    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    before(testUtils.setup('users:roles', 'newsletters'));

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('/test-url/');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('URL transformations without CDN config', function () {
        it('transforms header_image to absolute site URL', async function () {
            const newsletter = await models.Newsletter.findOne({slug: 'new-newsletter'});
            should.exist(newsletter, 'New newsletter should exist');
            newsletter.get('header_image').should.equal(`${siteUrl}/content/images/newsletter-header.jpg`);
        });
    });
});
