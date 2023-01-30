const {agentProvider, fixtureManager, configUtils} = require('../../utils/e2e-framework');
const should = require('should');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');
const memberAttributionService = require('../../../core/server/services/member-attribution');
const urlUtils = require('../../../core/shared/url-utils');

describe('Member Attribution Service', function () {
    before(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
    });

    /**
     * Test that getAttribution correctly resolves all model types that are supported
     */
    describe('getAttribution for models', function () {
        describe('without subdirectory', function () {
            it('resolves urls', async function () {
                const subdomainRelative = '/my-static-page/';
                const url = urlUtils.createUrl(subdomainRelative, false);
                const absoluteUrl = urlUtils.createUrl(subdomainRelative, true);

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: null,
                    url: subdomainRelative,
                    type: 'url'
                }));

                (await attribution.fetchResource()).should.match(({
                    id: null,
                    url: absoluteUrl,
                    type: 'url',
                    title: subdomainRelative
                }));
            });

            it('resolves posts', async function () {
                const id = fixtureManager.get('posts', 0).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: post.id,
                    url,
                    type: 'post'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'post',
                    title: post.get('title')
                }));
            });

            it('resolves removed resources', async function () {
                const id = fixtureManager.get('posts', 0).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: false});
                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);

                // Without subdirectory
                attribution.should.match(({
                    id: post.id,
                    url: urlWithoutSubdirectory,
                    type: 'post'
                }));

                // Unpublish this post
                await models.Post.edit({status: 'draft'}, {id});

                (await attribution.fetchResource()).should.match(({
                    id: null,
                    url: absoluteUrl,
                    type: 'url',
                    title: urlWithoutSubdirectory
                }));

                await models.Post.edit({status: 'published'}, {id});
            });

            it('resolves pages', async function () {
                const id = fixtureManager.get('posts', 5).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                should(post.get('type')).eql('page');

                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: post.id,
                    url,
                    type: 'page'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'page',
                    title: post.get('title')
                }));
            });

            it('resolves tags', async function () {
                const id = fixtureManager.get('tags', 0).id;
                const tag = await models.Tag.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(tag.id, {absolute: false, withSubdirectory: true});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: tag.id,
                    url,
                    type: 'tag'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(tag.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: tag.id,
                    url: absoluteUrl,
                    type: 'tag',
                    title: tag.get('name')
                }));
            });

            it('resolves authors', async function () {
                const id = fixtureManager.get('users', 0).id;
                const author = await models.User.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(author.id, {absolute: false, withSubdirectory: true});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: author.id,
                    url,
                    type: 'author'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(author.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: author.id,
                    url: absoluteUrl,
                    type: 'author',
                    title: author.get('name')
                }));
            });
        });

        describe('with subdirectory', function () {
            beforeEach(function () {
                configUtils.set('url', 'https://siteurl.com/subdirectory/');
            });

            afterEach(async function () {
                await configUtils.restore();
            });

            it('resolves urls', async function () {
                const subdomainRelative = '/my-static-page/';
                const url = urlUtils.createUrl(subdomainRelative, false);
                const absoluteUrl = urlUtils.createUrl(subdomainRelative, true);

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: null,
                    url: subdomainRelative,
                    type: 'url'
                }));

                (await attribution.fetchResource()).should.match(({
                    id: null,
                    url: absoluteUrl,
                    type: 'url',
                    title: subdomainRelative
                }));
            });

            it('resolves posts', async function () {
                const id = fixtureManager.get('posts', 0).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: false});

                // Check if we are actually testing with subdirectories
                should(url).startWith('/subdirectory/');

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);

                // Without subdirectory
                attribution.should.match(({
                    id: post.id,
                    url: urlWithoutSubdirectory,
                    type: 'post'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'post',
                    title: post.get('title')
                }));
            });

            it('resolves removed resources', async function () {
                const id = fixtureManager.get('posts', 0).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: false});
                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                // Check if we are actually testing with subdirectories
                should(url).startWith('/subdirectory/');

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);

                // Without subdirectory
                attribution.should.match(({
                    id: post.id,
                    url: urlWithoutSubdirectory,
                    type: 'post'
                }));

                // Unpublish this post
                await models.Post.edit({status: 'draft'}, {id});

                (await attribution.fetchResource()).should.match(({
                    id: null,
                    url: absoluteUrl,
                    type: 'url',
                    title: urlWithoutSubdirectory
                }));
            });

            it('resolves pages', async function () {
                const id = fixtureManager.get('posts', 5).id;
                const post = await models.Post.where('id', id).fetch({require: true});
                should(post.get('type')).eql('page');

                const url = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(post.id, {absolute: false, withSubdirectory: false});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: post.id,
                    url: urlWithoutSubdirectory,
                    type: 'page'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'page',
                    title: post.get('title')
                }));
            });

            it('resolves tags', async function () {
                const id = fixtureManager.get('tags', 0).id;
                const tag = await models.Tag.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(tag.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(tag.id, {absolute: false, withSubdirectory: false});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: tag.id,
                    url: urlWithoutSubdirectory,
                    type: 'tag'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(tag.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: tag.id,
                    url: absoluteUrl,
                    type: 'tag',
                    title: tag.get('name')
                }));
            });

            it('resolves authors', async function () {
                const id = fixtureManager.get('users', 0).id;
                const author = await models.User.where('id', id).fetch({require: true});
                const url = urlService.getUrlByResourceId(author.id, {absolute: false, withSubdirectory: true});
                const urlWithoutSubdirectory = urlService.getUrlByResourceId(author.id, {absolute: false, withSubdirectory: false});

                const attribution = await memberAttributionService.service.getAttribution([
                    {
                        path: url,
                        time: Date.now()
                    }
                ]);
                attribution.should.match(({
                    id: author.id,
                    url: urlWithoutSubdirectory,
                    type: 'author'
                }));

                const absoluteUrl = urlService.getUrlByResourceId(author.id, {absolute: true, withSubdirectory: true});

                (await attribution.fetchResource()).should.match(({
                    id: author.id,
                    url: absoluteUrl,
                    type: 'author',
                    title: author.get('name')
                }));
            });
        });
    });

    /**
     * Test that getAttribution correctly resolves all model types that are supported
     */
    describe('getAttribution for referrer', function () {
        it('resolves urls', async function () {
            const attribution = await memberAttributionService.service.getAttribution([
                {
                    id: null,
                    path: '/',
                    time: Date.now(),
                    referrerSource: 'ghost-explore',
                    referrerMedium: null,
                    referrerUrl: null
                }
            ]);
            attribution.should.match(({
                id: null,
                url: '/',
                type: 'url',
                referrerSource: 'Ghost Explore',
                referrerMedium: 'Ghost Network',
                referrerUrl: null
            }));
        });
    });
});
