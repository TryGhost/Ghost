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
            attribution.should.match(({
                id: post.id,
                url,
                type: 'post'
            }));

            const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

            (await attribution.getResource()).should.match(({
                id: post.id,
                url: absoluteUrl,
                type: 'post',
                title: post.get('title')
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
            attribution.should.match(({
                id: post.id,
                url,
                type: 'page'
            }));

            const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

            (await attribution.getResource()).should.match(({
                id: post.id,
                url: absoluteUrl,
                type: 'page',
                title: post.get('title')
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
            attribution.should.match(({
                id: tag.id,
                url,
                type: 'tag'
            }));

            const absoluteUrl = urlService.getUrlByResourceId(tag.id, {absolute: true});

            (await attribution.getResource()).should.match(({
                id: tag.id,
                url: absoluteUrl,
                type: 'tag',
                title: tag.get('name')
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
            attribution.should.match(({
                id: author.id,
                url,
                type: 'author'
            }));

            const absoluteUrl = urlService.getUrlByResourceId(author.id, {absolute: true});

            (await attribution.getResource()).should.match(({
                id: author.id,
                url: absoluteUrl,
                type: 'author',
                title: author.get('name')
            }));
        });
    });
});
