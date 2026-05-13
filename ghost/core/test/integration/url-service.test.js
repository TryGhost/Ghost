const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const UrlService = require('../../core/server/services/url/url-service');

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

describe('Integration: services/url/createFindResource', function () {
    // The lazy URL service evaluates routes.yaml NQL filters (e.g.
    // `tag:news`, `author:jane`) against records returned by findResource.
    // EXPANSIONS rewrite those to `tags.slug:news` / `authors.slug:jane`,
    // so the loaded record must carry its tags and authors relations or
    // every tag- or author-filtered route silently 404s. These tests pin
    // that contract against real models.
    const models = require('../../core/server/models');
    const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');
    const LazyUrlService = require('../../core/server/services/url/lazy-url-service');

    let findResource;

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    before(function () {
        findResource = createFindResource(models);
    });
    after(testUtils.teardownDb);

    it('populates tags on a published post', async function () {
        // posts[0] (html-ipsum) is bound to tags[0] (kitchen-sink) and
        // tags[1] (bacon) in the posts_tags fixture mapping.
        const post = await findResource('posts', {slug: 'html-ipsum'});

        assert.ok(post, 'fixture post should be findable');
        assert.ok(Array.isArray(post.tags) && post.tags.length > 0, 'tags must be loaded');
        const slugs = post.tags.map(t => t.slug);
        assert.ok(slugs.includes('kitchen-sink'), `expected kitchen-sink tag, got ${slugs.join(',')}`);
    });

    it('populates authors on a published post', async function () {
        const post = await findResource('posts', {slug: 'html-ipsum'});

        assert.ok(post);
        assert.ok(Array.isArray(post.authors) && post.authors.length > 0, 'authors must be loaded');
        assert.ok(post.authors[0].slug, 'each author must carry a slug');
    });

    it('returns null for an unpublished slug (mirrors the eager filter)', async function () {
        // posts[2] (short-and-sweet) is owned by the eager service's
        // `featured:false` collection — confirms findResource itself
        // matches the eager service's status:published gate.
        const draft = await findResource('posts', {slug: 'unfinished'});
        assert.equal(draft, null);
    });

    it('resolves a tag-filtered route end-to-end through LazyUrlService', async function () {
        const lazy = new LazyUrlService({findResource});
        lazy.onRouterAddedType('kitchen', 'tag:kitchen-sink', 'posts', '/:slug/');

        const resource = await lazy.resolveUrl('/html-ipsum/');
        assert.ok(resource, 'tag-filtered post must resolve, not 404');
        assert.equal(resource.slug, 'html-ipsum');
    });

    it('rejects a tag-filtered route when the post does not match the filter', async function () {
        const lazy = new LazyUrlService({findResource});
        // posts[0] has kitchen-sink and bacon; not pollo.
        lazy.onRouterAddedType('pollo', 'tag:pollo', 'posts', '/:slug/');

        const resource = await lazy.resolveUrl('/html-ipsum/');
        assert.equal(resource, null);
    });
});
