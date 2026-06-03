const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const LazyUrlService = require('../../../../../core/server/services/url/lazy-url-service');

function makeUrlUtils() {
    // Minimal url-utils stub: replacePermalink substitutes our test fields and
    // createUrl returns the path verbatim so we can assert on the relative form.
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
            // Only the positive match is assertable here: a type:'page' record
            // routes to the pages collection, never reaching this posts filter.
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            const post = service.getUrlForResource({type: 'post', id: 'p', slug: 'hello'});
            assert.equal(post, '/hello/');
        });

        it('normalizes the plural router type so page: filters still match', function () {
            // Migrated callers tag resources with the plural type ('posts'),
            // but the page: transformer matches the singular DB value.
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            const post = service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'});
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

        it('does not prefix the /404/ fallback with the subdirectory (eager parity)', function () {
            // Eager getUrlByResourceId formats the miss path without the
            // subdirectory arg, unlike a resolved URL — keep that parity.
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            const unmatched = {type: 'posts', id: 'p', slug: 'meh', featured: false};
            assert.equal(service.getUrlForResource(unmatched, {withSubdirectory: true}), '/404/');
            assert.equal(service.getUrlForResource(unmatched, {absolute: true}), 'https://example.com/404/');
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

        it('normalizes the plural router type for page: filters', function () {
            // Collection callers pass the plural resourceType ('posts'); the
            // page: filter must still match the singular DB value.
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            assert.equal(service.ownsResource('posts-only', {type: 'posts', id: 'a', slug: 'x'}), true);
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
            // Both routers match `/hello/`; posts is registered first so it
            // wins and pages is never consulted.
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

        // The next tests pin the contract: a tag-/author-filtered router only
        // resolves when findResource loads the relevant relation.
        it('returns null for a tag-filtered router when findResource omits the tags relation', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            assert.equal(await service.resolveUrl('/hello/'), null);
        });

        it('resolves a tag-filtered router when findResource populates the tags relation', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', tags: [{slug: 'news'}]});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            const result = await service.resolveUrl('/hello/');
            assert.equal(result.id, 'p1');
        });

        it('resolves an author-filtered router when findResource populates the authors relation', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', authors: [{slug: 'jane'}]});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('jane', 'author:jane', 'posts', '/:slug/');

            const result = await service.resolveUrl('/hello/');
            assert.equal(result.id, 'p1');
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
            // withArgs binds to the exact param shape, so dropping a capture fails here.
            findResource
                .withArgs('posts', {primary_tag: 'podcast', slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', primary_tag: {slug: 'podcast'}});

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
                .resolves({id: 'p1', slug: 'hello', published_at: '2026-04-15T10:00:00Z'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year/:month/:slug/');

            const result = await service.resolveUrl('/2026/04/hello/');
            assert.equal(result.id, 'p1');
        });

        // Bookshelf drops non-column captures before the query, so findResource
        // can return a slug match whose date/tag segments differ. The canonical
        // re-render must reject those non-canonical paths.
        it('rejects a date permalink whose segments do not match the record', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {year: '2099', month: '01', slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', published_at: '2015-03-09T10:00:00Z'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year/:month/:slug/');

            assert.equal(await service.resolveUrl('/2099/01/hello/'), null);
        });

        it('rejects a primary_tag permalink whose tag does not match the record', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {primary_tag: 'podcast', slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', primary_tag: {slug: 'tech'}});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:primary_tag/:slug/');

            assert.equal(await service.resolveUrl('/podcast/hello/'), null);
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
            service.onRouterAddedType('default', null, 'posts', '/blog-:slug/');

            assert.equal(await service.resolveUrl('/blog-hello/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('uses the singular DB type field to find posts collections', async function () {
            const findResource = sinon.stub();
            findResource.resolves({id: 'p1', slug: 'hello', type: 'post'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            // A raw DB record (type:'post') should still match the posts collection.
            const url = service.getUrlForResource({type: 'post', id: 'p1', slug: 'hello'});
            assert.equal(url, '/hello/');
        });
    });
});

describe('LazyUrlService (hardening, beyond parity)', function () {
    let urlUtils;

    beforeEach(function () {
        urlUtils = makeUrlUtils();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('onRouterUpdated', function () {
        it('is a no-op that leaves the registered routers intact', function () {
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            service.onRouterUpdated();

            assert.equal(
                service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'}),
                '/hello/'
            );
        });
    });

    describe('thin-resource warning', function () {
        it('logs a structured error when a relation-filtered router gets a thin resource', function () {
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'});

            assert.equal(url, '/404/');
            sinon.assert.calledOnce(errorStub);
            const loggedError = errorStub.firstCall.args[0];
            assert.equal(loggedError.code, 'LAZY_URL_THIN_RESOURCE');
            assert.deepEqual(loggedError.errorDetails.missing, ['tags']);
            assert.equal(loggedError.errorDetails.routerIdentifier, 'news');
        });

        it('does not warn when the router filter references no relations', function () {
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/:slug/');

            service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', featured: true});

            sinon.assert.notCalled(errorStub);
        });

        it('does not warn when the relation is present but empty', function () {
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', tags: []});

            sinon.assert.notCalled(errorStub);
        });

        it('does not warn for a primary_tag filter when primary_tag is populated without the tags array', function () {
            // primary_tag: expands to primary_tag.slug, so the full tags array
            // is not required — warning here would be a false positive.
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('podcast', 'primary_tag:podcast', 'posts', '/podcast/:slug/');

            service.getUrlForResource({
                type: 'posts',
                id: 'p',
                slug: 'hello',
                primary_tag: {slug: 'podcast'}
            });

            sinon.assert.notCalled(errorStub);
        });

        it('warns with primary_tag missing when a primary_tag filter gets a resource without it', function () {
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('podcast', 'primary_tag:podcast', 'posts', '/podcast/:slug/');

            service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'});

            sinon.assert.calledOnce(errorStub);
            assert.deepEqual(errorStub.firstCall.args[0].errorDetails.missing, ['primary_tag']);
        });

        it('does not treat primary_tag as null-thin when the relation loaded with no public tag', function () {
            // primary_tag:null (loaded, no public tag) is a legitimate no-match,
            // not a thin resource.
            const errorStub = sinon.stub(logging, 'error');
            const service = new LazyUrlService({urlUtils});
            service.onRouterAddedType('podcast', 'primary_tag:podcast', 'posts', '/podcast/:slug/');

            service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', primary_tag: null});

            sinon.assert.notCalled(errorStub);
        });
    });

    describe('reset', function () {
        it('also stops reverse lookups from resolving', async function () {
            const findResource = sinon.stub().resolves({id: 'p1', slug: 'hello'});
            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.ok(await service.resolveUrl('/hello/'));

            service.reset();

            assert.equal(await service.resolveUrl('/hello/'), null);
        });
    });

    describe('module export shape', function () {
        it('is constructible both as the default export and the named export', function () {
            const Named = require('../../../../../core/server/services/url/lazy-url-service').LazyUrlService;
            assert.equal(typeof LazyUrlService, 'function');
            assert.equal(Named, LazyUrlService);
        });
    });
});
