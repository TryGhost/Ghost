const assert = require('node:assert/strict');
const sinon = require('sinon');
const LazyUrlService = require('../../../../../core/server/services/url/lazy-url-service');

function makeUrlUtils() {
    // Just enough of url-utils to satisfy the service. createUrl returns the
    // path verbatim so tests can assert on the relative form; replacePermalink
    // does the same substitution Ghost's url-utils does for our limited fields.
    // Permalinks use the `:field` syntax that Ghost's RouteSettings validator
    // rewrites all `{field}` placeholders into before they reach the URL
    // service.
    return {
        replacePermalink(permalink, resource) {
            const datePart = resource.published_at ? new Date(resource.published_at) : null;
            return permalink
                .replace(/:slug\b/, resource.slug || '')
                .replace(/:id\b/, resource.id || '')
                .replace(/:primary_tag\b/, resource.primary_tag?.slug || '')
                .replace(/:primary_author\b/, resource.primary_author?.slug || '')
                .replace(/:year\b/, datePart ? String(datePart.getUTCFullYear()) : '')
                .replace(/:month\b/, datePart ? String(datePart.getUTCMonth() + 1).padStart(2, '0') : '')
                .replace(/:day\b/, datePart ? String(datePart.getUTCDate()).padStart(2, '0') : '');
        },
        createUrl(path, absolute, withSubdirectory) {
            if (absolute) {
                return `https://example.com${path}`;
            }
            if (withSubdirectory) {
                return `/sub${path}`;
            }
            return path;
        }
    };
}

describe('LazyUrlService', function () {
    let urlUtils;

    beforeEach(function () {
        urlUtils = makeUrlUtils();
    });

    describe('getUrlForResource', function () {
        it('returns /404/ when no router has been registered', function () {
            const service = new LazyUrlService({urlUtils});
            const url = service.getUrlForResource({type: 'posts', id: 'a', slug: 'hello'});
            assert.equal(url, '/404/');
        });

        it('returns /404/ when called without a resource type', function () {
            const service = new LazyUrlService({urlUtils});
            assert.equal(service.getUrlForResource(null), '/404/');
            assert.equal(service.getUrlForResource({}), '/404/');
        });

        it('uses the unfiltered collection router for any post', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'});
            assert.equal(url, '/hello/');
        });

        it('respects router priority for filtered collections', function () {
            const service = new LazyUrlService({urlUtils});
            // Featured posts go to /featured/, everything else to /:slug/.
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const featured = service.getUrlForResource({type: 'posts', id: 'f', slug: 'hot', featured: true});
            const ordinary = service.getUrlForResource({type: 'posts', id: 'p', slug: 'meh', featured: false});

            assert.equal(featured, '/featured/hot/');
            assert.equal(ordinary, '/meh/');
        });

        it('falls back to /404/ when a post matches no collection filter', function () {
            const service = new LazyUrlService({urlUtils});
            // Only featured posts are routed.
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'meh', featured: false});
            assert.equal(url, '/404/');
        });

        it('expands shorthand tag/author filters via the EXPANSIONS table', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('podcast', 'tag:podcast', 'posts', '/podcast/:slug/');
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const podcastPost = service.getUrlForResource({
                type: 'posts',
                id: 'p',
                slug: 'episode-1',
                tags: [{id: 't1', slug: 'podcast'}, {id: 't2', slug: 'misc'}]
            });
            assert.equal(podcastPost, '/podcast/episode-1/');
        });

        it('matches page:false against the singular DB type field', function () {
            // The legacy transformer rewrites `page:false` to `type:post` and
            // evaluates it against the resource's singular DB-style `type`
            // field. The negative half (a record whose `type` is 'page'
            // failing the filter) is not directly expressible through this
            // public API: `_routerTypeOf('page')` returns 'pages', so a
            // type:'page' resource is routed to the pages collection rather
            // than reaching this posts router's filter at all. That's why
            // only the positive match is asserted here.
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            const post = service.getUrlForResource({type: 'post', id: 'p', slug: 'hello'});
            assert.equal(post, '/hello/');
        });

        it('handles deterministic ownership for tags/authors/pages', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('tagsRouter', null, 'tags', '/tag/:slug/');
            service.onRouterAddedType('authorsRouter', null, 'authors', '/author/:slug/');
            service.onRouterAddedType('staticPages', null, 'pages', '/:slug/');

            assert.equal(
                service.getUrlForResource({type: 'tags', id: 't1', slug: 'food'}),
                '/tag/food/'
            );
            assert.equal(
                service.getUrlForResource({type: 'authors', id: 'a1', slug: 'jane'}),
                '/author/jane/'
            );
            assert.equal(
                service.getUrlForResource({type: 'pages', id: 'pg1', slug: 'about'}),
                '/about/'
            );
        });

        it('substitutes date-based permalink fields', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('dated', null, 'posts', '/:year/:month/:slug/');

            const url = service.getUrlForResource({
                type: 'posts',
                id: 'p',
                slug: 'hello',
                published_at: '2026-04-15T10:00:00Z'
            });
            assert.equal(url, '/2026/04/hello/');
        });

        it('honours the absolute and withSubdirectory options', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const post = {type: 'posts', id: 'p', slug: 'hello'};
            assert.equal(service.getUrlForResource(post, {absolute: true}), 'https://example.com/hello/');
            assert.equal(service.getUrlForResource(post, {withSubdirectory: true}), '/sub/hello/');
        });
    });

    describe('ownsResource', function () {
        it('returns false for an unknown router identifier', function () {
            const service = new LazyUrlService({urlUtils});
            assert.equal(service.ownsResource('unknown', {type: 'posts', id: 'p'}), false);
        });

        it('returns true for an unfiltered router that matches the resource type', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.ownsResource('default', {type: 'posts', id: 'p', slug: 'x'}), true);
        });

        it('returns false when the resource type does not match the router', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.ownsResource('default', {type: 'pages', id: 'p', slug: 'x'}), false);
        });

        it('evaluates NQL filters against the resource', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            assert.equal(service.ownsResource('featured', {type: 'posts', id: 'a', featured: true}), true);
            assert.equal(service.ownsResource('featured', {type: 'posts', id: 'b', featured: false}), false);
        });
    });

    describe('hasFinished', function () {
        it('always returns true', function () {
            assert.equal(new LazyUrlService({urlUtils}).hasFinished(), true);
        });
    });

    describe('reset', function () {
        it('drops all registered router configs', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.getUrlForResource({type: 'posts', slug: 'hello', id: 'p'}), '/hello/');

            service.reset();
            assert.equal(service.getUrlForResource({type: 'posts', slug: 'hello', id: 'p'}), '/404/');
        });
    });

    describe('resolveUrl', function () {
        it('returns null when no findResource hook is configured', async function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(await service.resolveUrl('/hello/'), null);
        });

        it('extracts slug params and queries the DB by router type', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello', title: 'Hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const result = await service.resolveUrl('/hello/');
            assert.deepEqual(result, {id: 'p1', slug: 'hello', title: 'Hello', type: 'posts'});
            sinon.assert.calledWith(findResource, 'posts', {slug: 'hello'});
        });

        it('iterates routers in priority order, picking the first whose template matches', async function () {
            // Two routers with overlapping templates: a single-segment posts
            // collection at /:slug/ and a single-segment static-pages
            // collection at /:slug/. Both can pattern-match `/hello/`. The
            // posts collection is registered first, so it wins — and the
            // static pages router is never consulted via findResource.
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('posts', null, 'posts', '/:slug/');
            service.onRouterAddedType('staticPages', null, 'pages', '/:slug/');

            const result = await service.resolveUrl('/hello/');
            assert.equal(result.type, 'posts');
            assert.equal(result.id, 'p1');
            sinon.assert.neverCalledWith(findResource, 'pages', sinon.match.any);
        });

        it('verifies NQL filters for filtered post collections', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'plain'}).resolves({id: 'p2', slug: 'plain', featured: false});
            findResource.withArgs('posts', {slug: 'hot'}).resolves({id: 'p3', slug: 'hot', featured: true});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            // 'plain' is found in the DB but its featured filter rejects it.
            assert.equal(await service.resolveUrl('/featured/plain/'), null);
            const hot = await service.resolveUrl('/featured/hot/');
            assert.equal(hot.id, 'p3');
        });

        it('returns null when no router template matches the URL', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            assert.equal(await service.resolveUrl('/some/other/path/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('matches multi-segment permalinks (e.g. /:primary_tag/:slug/)', async function () {
            const findResource = sinon.stub();
            // withArgs binds the resolve to the exact param shape, so a
            // regression that drops one of the captures (e.g. forgets to
            // pass `primary_tag`) fails on the resolve, not just on the spy.
            findResource
                .withArgs('posts', {primary_tag: 'podcast', slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:primary_tag/:slug/');

            const result = await service.resolveUrl('/podcast/hello/');
            assert.equal(result.id, 'p1');
            assert.equal(result.type, 'posts');
        });

        it('matches date-based permalinks', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {year: '2026', month: '04', slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year/:month/:slug/');

            const result = await service.resolveUrl('/2026/04/hello/');
            assert.equal(result.id, 'p1');
        });

        it('does not throw on malformed %-escapes; returns null instead', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const result = await service.resolveUrl('/foo%ZZ/');
            assert.equal(result, null);
            sinon.assert.notCalled(findResource);
        });

        it('rejects mixed-literal-and-placeholder segments (no ReDoS surface)', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            // Mixed segments like `/blog-:slug/` are not a documented Ghost
            // permalink shape; we deliberately don't try to match them.
            service.onRouterAddedType('default', null, 'posts', '/blog-:slug/');

            assert.equal(await service.resolveUrl('/blog-hello/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('uses the singular DB type field to find posts collections', async function () {
            const findResource = sinon.stub();
            findResource.resolves({id: 'p1', slug: 'hello', type: 'post'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            // Caller (e.g. the entry controller / RSS feed) hands the lazy
            // service a raw DB record with type:'post'. The service should
            // still match the posts collection.
            const url = service.getUrlForResource({type: 'post', id: 'p1', slug: 'hello'});
            assert.equal(url, '/hello/');
        });
    });
});
