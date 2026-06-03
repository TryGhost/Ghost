const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const models = require('../../core/server/models');
const UrlService = require('../../core/server/services/url/url-service');
const LazyUrlService = require('../../core/server/services/url/lazy-url-service');
const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');

describe('Integration: services/url/UrlService', function () {
    let urlService;

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    after(testUtils.teardownDb);

    after(function () {
        sinon.restore();
    });

    describe('functional: default routing set', function () {
        before(function (done) {
            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:false', 'posts', '/:slug/');
            urlService.onRouterAddedType('unique-id-2', null, 'authors', '/author/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'tags', '/tag/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        after(function () {
            urlService.reset();
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'pages') {
                    assert.equal(generator.getUrls().length, 1);
                }

                if (generator.resourceType === 'tags') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'authors') {
                    assert.equal(generator.getUrls().length, 2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            assert.equal(url, '/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            assert.equal(url, '/ghostly-kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            assert.equal(url, '/404/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            assert.equal(url, '/tag/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            assert.equal(url, '/tag/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            assert.equal(url, '/tag/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            assert.equal(url, '/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            assert.equal(url, '/author/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            assert.equal(url, '/author/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            assert.equal(url, '/404/'); // users with no posts should not be public
        });

        it('getResource', function () {
            let resource = urlService.getResource('/html-ipsum/');
            assert.equal(resource.data.id, testUtils.DataGenerator.forKnex.posts[0].id);

            resource = urlService.getResource('/does-not-exist/');
            assert.equal(resource, null);
        });
    });

    describe('functional: lazy findResource against real models', function () {
        let findResource;

        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles', 'posts'));

        before(function () {
            findResource = createFindResource(models);
        });

        describe('posts', function () {
            it('finds a published post by slug and loads its tags/authors relations', async function () {
                const post = await findResource('posts', {slug: 'html-ipsum'});

                assert.ok(post, 'expected the published post to be found');
                assert.equal(post.slug, 'html-ipsum');
                assert.equal(post.type, 'post');
                assert.ok(Array.isArray(post.tags), 'tags relation should be loaded');
                assert.ok(Array.isArray(post.authors), 'authors relation should be loaded');
                assert.ok(post.authors.length >= 1, 'posts always have at least one author');
            });

            it('does not return draft posts', async function () {
                assert.equal(await findResource('posts', {slug: 'unfinished'}), null);
            });

            it('does not return a page when querying the posts collection', async function () {
                assert.equal(await findResource('posts', {slug: 'static-page-test'}), null);
            });
        });

        describe('pages', function () {
            it('finds a published page by slug', async function () {
                const page = await findResource('pages', {slug: 'static-page-test'});

                assert.ok(page, 'expected the published page to be found');
                assert.equal(page.slug, 'static-page-test');
                assert.equal(page.type, 'page');
            });

            it('does not return draft pages', async function () {
                assert.equal(await findResource('pages', {slug: 'static-page-draft'}), null);
            });

            it('does not return a post when querying the pages collection', async function () {
                assert.equal(await findResource('pages', {slug: 'html-ipsum'}), null);
            });
        });

        describe('tags', function () {
            it('finds a public tag that has published posts', async function () {
                const tag = await findResource('tags', {slug: 'kitchen-sink'});

                assert.ok(tag, 'expected the public tag to be found');
                assert.equal(tag.slug, 'kitchen-sink');
            });

            it('does not surface a tag with no published posts', async function () {
                const emptyTag = testUtils.DataGenerator.forKnex.tags[3];
                assert.equal(await findResource('tags', {slug: emptyTag.slug}), null);
            });
        });

        describe('authors', function () {
            it('finds an author with published posts', async function () {
                const author = await findResource('authors', {slug: 'joe-bloggs'});

                assert.ok(author, 'expected the author with posts to be found');
                assert.equal(author.slug, 'joe-bloggs');
            });

            it('does not surface a user with no published posts', async function () {
                const noPosts = testUtils.DataGenerator.forKnex.users[1];
                assert.equal(await findResource('authors', {slug: noPosts.slug}), null);
            });
        });

        it('returns null for unknown router types without querying', async function () {
            assert.equal(await findResource('unknown', {slug: 'html-ipsum'}), null);
        });

        describe('end-to-end via LazyUrlService.resolveUrl', function () {
            it('resolves a real published post URL through the service', async function () {
                const service = new LazyUrlService({findResource});
                service.onRouterAddedType('posts', null, 'posts', '/:slug/');

                const resource = await service.resolveUrl('/html-ipsum/');

                assert.ok(resource);
                assert.equal(resource.type, 'posts');
                assert.equal(resource.slug, 'html-ipsum');
            });

            it('returns null for a draft slug', async function () {
                const service = new LazyUrlService({findResource});
                service.onRouterAddedType('posts', null, 'posts', '/:slug/');

                assert.equal(await service.resolveUrl('/unfinished/'), null);
            });
        });
    });

    describe('functional: extended/modified routing set', function () {
        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles', 'posts'));

        before(function () {
            urlService.resetGenerators();
        });

        before(function (done) {
            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:true', 'posts', '/podcast/:slug/');
            urlService.onRouterAddedType('unique-id-2', 'type:post', 'posts', '/collection/:year/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'authors', '/persons/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'tags', '/category/:slug/');
            urlService.onRouterAddedType('unique-id-5', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        after(function () {
            urlService.resetGenerators();
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts' && generator.filter === 'type:post') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'posts' && generator.filter === 'featured:true') {
                    assert.equal(generator.getUrls().length, 2);
                }

                if (generator.resourceType === 'pages') {
                    assert.equal(generator.getUrls().length, 1);
                }

                if (generator.resourceType === 'tags') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'authors') {
                    assert.equal(generator.getUrls().length, 2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            assert.equal(url, '/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            assert.equal(url, '/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            assert.equal(url, '/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            assert.equal(url, '/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            assert.equal(url, '/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            assert.equal(url, '/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            assert.equal(url, '/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            assert.equal(url, '/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            assert.equal(url, '/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            assert.equal(url, '/404/'); // users with no posts should not be public
        });
    });

    describe('functional: subdirectory', function () {
        beforeEach(function (done) {
            configUtils.set('url', 'http://localhost:2388/blog/');

            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:false', 'posts', '/collection/:year/:slug/');
            urlService.onRouterAddedType('unique-id-2', 'featured:true', 'posts', '/podcast/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'authors', '/persons/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'tags', '/category/:slug/');
            urlService.onRouterAddedType('unique-id-5', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(async function () {
            urlService.resetGenerators();
            await configUtils.restore();
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts' && generator.filter === 'featured:false') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'posts' && generator.filter === 'featured:true') {
                    assert.equal(generator.getUrls().length, 2);
                }

                if (generator.resourceType === 'pages') {
                    assert.equal(generator.getUrls().length, 1);
                }

                if (generator.resourceType === 'tags') {
                    assert.equal(generator.getUrls().length, 4);
                }

                if (generator.resourceType === 'authors') {
                    assert.equal(generator.getUrls().length, 2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            assert.equal(url, '/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            assert.equal(url, '/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            assert.equal(url, '/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            assert.equal(url, '/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            assert.equal(url, '/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            assert.equal(url, '/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            assert.equal(url, '/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            assert.equal(url, '/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            assert.equal(url, '/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            assert.equal(url, '/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            assert.equal(url, '/404/'); // users with no posts should not be public
        });
    });
});
