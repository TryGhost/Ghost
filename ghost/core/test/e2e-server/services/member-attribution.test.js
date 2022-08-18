const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const should = require('should');
const nock = require('nock');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');
const memberAttributionService = require('../../../core/server/services/member-attribution');

describe('Member Attribution Service', function () {
    before(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
    });

    afterEach(function () {
        nock.cleanAll();
    });

    /**
     * Test that getAttribution correctly resolves all model types that are supported
     */
    describe('getAttribution for models', function () {
        it('resolves posts', async function () {
            const id = fixtureManager.get('posts', 0).id;
            const post = await models.Post.where('id', id).fetch({require: true});
            const url = urlService.getUrlByResourceId(post.id, {absolute: false});

            const attribution = memberAttributionService.service.getAttribution([
                {
                    path: url,
                    time: 123
                }
            ]);
            attribution.should.eql(({
                id: post.id,
                url,
                type: 'post'
            }));
        });

        it('resolves pages', async function () {
            const id = fixtureManager.get('posts', 5).id;
            const post = await models.Post.where('id', id).fetch({require: true});
            should(post.get('type')).eql('page');

            const url = urlService.getUrlByResourceId(post.id, {absolute: false});

            const attribution = memberAttributionService.service.getAttribution([
                {
                    path: url,
                    time: 123
                }
            ]);
            attribution.should.eql(({
                id: post.id,
                url,
                type: 'page'
            }));
        });

        it('resolves tags', async function () {
            const id = fixtureManager.get('tags', 0).id;
            const tag = await models.Tag.where('id', id).fetch({require: true});
            const url = urlService.getUrlByResourceId(tag.id, {absolute: false});

            const attribution = memberAttributionService.service.getAttribution([
                {
                    path: url,
                    time: 123
                }
            ]);
            attribution.should.eql(({
                id: tag.id,
                url,
                type: 'tag'
            }));
        });

        it('resolves authors', async function () {
            const id = fixtureManager.get('users', 0).id;
            const author = await models.User.where('id', id).fetch({require: true});
            const url = urlService.getUrlByResourceId(author.id, {absolute: false});

            const attribution = memberAttributionService.service.getAttribution([
                {
                    path: url,
                    time: 123
                }
            ]);
            attribution.should.eql(({
                id: author.id,
                url,
                type: 'author'
            }));
        });
    });
});
