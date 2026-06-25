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

const noopFindResource = () => Promise.resolve(null);

describe('LazyUrlService', function () {
    let urlUtils;

    beforeEach(function () {
        urlUtils = makeUrlUtils();
    });

    describe('getUrlForResource', function () {
        it('returns /404/ when no router has been registered', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            const url = service.getUrlForResource({type: 'posts', id: 'a', slug: 'hello'});
            assert.equal(url, '/404/');
        });

        it('returns /404/ when called without a resource type', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            assert.equal(service.getUrlForResource(null), '/404/');
            assert.equal(service.getUrlForResource({}), '/404/');
        });

        it('uses the unfiltered collection router for any post', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', status: 'published'});
            assert.equal(url, '/hello/');
        });

        it('respects router priority for filtered collections', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            // Featured posts go to /featured/, everything else to /:slug/.
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const featured = service.getUrlForResource({type: 'posts', id: 'f', slug: 'hot', status: 'published', featured: true});
            const ordinary = service.getUrlForResource({type: 'posts', id: 'p', slug: 'meh', status: 'published', featured: false});

            assert.equal(featured, '/featured/hot/');
            assert.equal(ordinary, '/meh/');
        });

        it('falls back to /404/ when a post matches no collection filter', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            // Only featured posts are routed.
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'meh', status: 'published', featured: false});
            assert.equal(url, '/404/');
        });

        it('returns /404/ for a post that fails the base filter (e.g. a draft)', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            // Eager only maps status:published posts, so a draft has no URL.
            const url = service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', status: 'draft'});
            assert.equal(url, '/404/');
        });

        it('throws when a post is missing a base-filter field (status)', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            // A resource that reaches URL generation must carry the columns its
            // base filter reads; production callers always provide status, so a
            // status-less post is a thin-resource bug we refuse loudly rather
            // than silently 404.
            assert.throws(
                () => service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello'}),
                /Thin resource passed to LazyUrlService/
            );
        });

        it('throws when a relation-filtered router is given a thin resource', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            // tag:news needs the tags relation; a resource with no tags array
            // can't be evaluated, which would otherwise silently 404.
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            assert.throws(
                () => service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', status: 'published'}),
                /Thin resource passed to LazyUrlService/
            );
        });

        it('does not throw when the relation a filter references is present', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/:slug/');

            // An empty tags array is still a loaded relation, so the resource is
            // evaluated normally and falls through to /404/ on no match.
            assert.equal(
                service.getUrlForResource({type: 'posts', id: 'p', slug: 'hello', status: 'published', tags: []}),
                '/404/'
            );
        });

        it('expands shorthand tag/author filters via the EXPANSIONS table', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('podcast', 'tag:podcast', 'posts', '/podcast/:slug/');
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const podcastPost = service.getUrlForResource({
                type: 'posts',
                id: 'p',
                slug: 'episode-1',
                status: 'published',
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
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            const post = service.getUrlForResource({type: 'post', id: 'p', slug: 'hello', status: 'published'});
            assert.equal(post, '/hello/');
        });

        it('handles deterministic ownership for tags/authors/pages', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('tagsRouter', null, 'tags', '/tag/:slug/');
            service.onRouterAddedType('authorsRouter', null, 'authors', '/author/:slug/');
            service.onRouterAddedType('staticPages', null, 'pages', '/:slug/');

            assert.equal(
                service.getUrlForResource({type: 'tags', id: 't1', slug: 'food', visibility: 'public'}),
                '/tag/food/'
            );
            assert.equal(
                service.getUrlForResource({type: 'authors', id: 'a1', slug: 'jane', visibility: 'public'}),
                '/author/jane/'
            );
            assert.equal(
                service.getUrlForResource({type: 'pages', id: 'pg1', slug: 'about', status: 'published'}),
                '/about/'
            );
        });

        it('returns /404/ for an internal/private tag (fails visibility:public)', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('tagsRouter', null, 'tags', '/tag/:slug/');

            // Eager filters its tag resources to visibility:public, so an
            // internal tag (#hash) has no URL there and must 404 here too.
            assert.equal(
                service.getUrlForResource({type: 'tags', id: 't1', slug: 'hash-internal', visibility: 'internal'}),
                '/404/'
            );
        });

        it('throws when a tag is missing the visibility base-filter field', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('tagsRouter', null, 'tags', '/tag/:slug/');

            assert.throws(
                () => service.getUrlForResource({type: 'tags', id: 't1', slug: 'food'}),
                /Thin resource passed to LazyUrlService/
            );
        });

        it('routes an author without a visibility field (authors have no base filter)', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('authorsRouter', null, 'authors', '/author/:slug/');

            // users.visibility is schema-pinned to 'public', so BASE_FILTERS has
            // no entry for authors. Serialized authors drop visibility (#10438),
            // so unlike tags they must not be treated as thin — every author is
            // routable, matching eager.
            assert.equal(
                service.getUrlForResource({type: 'authors', id: 'a1', slug: 'jane'}),
                '/author/jane/'
            );
        });

        it('substitutes date-based permalink fields', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('dated', null, 'posts', '/:year/:month/:slug/');

            const url = service.getUrlForResource({
                type: 'posts',
                id: 'p',
                slug: 'hello',
                status: 'published',
                published_at: '2026-04-15T10:00:00Z'
            });
            assert.equal(url, '/2026/04/hello/');
        });

        it('honours the absolute and withSubdirectory options', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const post = {type: 'posts', id: 'p', slug: 'hello', status: 'published'};
            assert.equal(service.getUrlForResource(post, {absolute: true}), 'https://example.com/hello/');
            assert.equal(service.getUrlForResource(post, {withSubdirectory: true}), '/sub/hello/');
        });
    });

    describe('ownsResource', function () {
        it('returns false for an unknown router identifier', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            assert.equal(service.ownsResource('unknown', {type: 'posts', id: 'p'}), false);
        });

        it('returns true for an unfiltered router that matches the resource type', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.ownsResource('default', {type: 'posts', id: 'p', slug: 'x', status: 'published'}), true);
        });

        it('returns false when the resource type does not match the router', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.ownsResource('default', {type: 'pages', id: 'p', slug: 'x', status: 'published'}), false);
        });

        it('returns false for a resource that fails its base filter', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('tagsRouter', null, 'tags', '/tag/:slug/');

            // An internal tag is not in eager's map, so no router owns it.
            assert.equal(service.ownsResource('tagsRouter', {type: 'tags', id: 't1', slug: 'x', visibility: 'internal'}), false);
            assert.equal(service.ownsResource('tagsRouter', {type: 'tags', id: 't1', slug: 'x', visibility: 'public'}), true);
        });

        it('evaluates NQL filters against the resource', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            assert.equal(service.ownsResource('featured', {type: 'posts', id: 'a', status: 'published', featured: true}), true);
            assert.equal(service.ownsResource('featured', {type: 'posts', id: 'b', status: 'published', featured: false}), false);
        });

        it('grants exclusive ownership to the first matching router', function () {
            // A featured collection ahead of a catch-all: the catch-all must
            // not claim a featured post the higher-priority router owns.
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const featured = {type: 'posts', id: 'f', slug: 'hot', status: 'published', featured: true};
            assert.equal(service.ownsResource('featured', featured), true);
            assert.equal(service.ownsResource('default', featured), false);

            const ordinary = {type: 'posts', id: 'p', slug: 'meh', status: 'published', featured: false};
            assert.equal(service.ownsResource('featured', ordinary), false);
            assert.equal(service.ownsResource('default', ordinary), true);
        });
    });

    describe('hasFinished', function () {
        it('always returns true', function () {
            assert.equal(new LazyUrlService({urlUtils, findResource: noopFindResource}).hasFinished(), true);
        });
    });

    describe('reset', function () {
        it('drops all registered router configs', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            assert.equal(service.getUrlForResource({type: 'posts', slug: 'hello', id: 'p', status: 'published'}), '/hello/');

            service.reset();
            assert.equal(service.getUrlForResource({type: 'posts', slug: 'hello', id: 'p', status: 'published'}), '/404/');
        });
    });

    describe('constructor', function () {
        it('throws when constructed without a findResource hook', function () {
            assert.throws(() => new LazyUrlService({urlUtils}), /findResource/);
        });
    });

    describe('resolveUrl', function () {
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

        it('evaluates a page:false router against the normalized record shape', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello', type: 'post'});
            findResource.withArgs('posts', {slug: 'a-page'}).resolves({id: 'pg1', slug: 'a-page', type: 'page'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('posts-only', 'page:false', 'posts', '/:slug/');

            // page:false compiles to type:post, so a post resolves but a record
            // the DB returns as a page is filtered out, matching the forward path.
            const post = await service.resolveUrl('/hello/');
            assert.equal(post.id, 'p1');
            assert.equal(await service.resolveUrl('/a-page/'), null);
        });

        it('does not repeat an identical findResource lookup within one resolveUrl call', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello', featured: false});

            const service = new LazyUrlService({urlUtils, findResource});
            // Two same-type routers share the /:slug/ shape: the higher-priority
            // one filters the record out, so resolution falls through to the next.
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/:slug/');
            service.onRouterAddedType('posts', 'featured:false', 'posts', '/:slug/');

            const result = await service.resolveUrl('/hello/');

            assert.equal(result.id, 'p1');
            sinon.assert.calledOnce(findResource);
        });

        // The next two tests pin the contract for findResource: tag/author
        // filters expand to `tags.slug` / `authors.slug` lookups via
        // EXPANSIONS, and NQL evaluates them against the loaded record. If
        // findResource returns posts without their tags/authors relations,
        // every tag- or author-filtered collection silently 404s.
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
            // Only the queryable slug column is passed to findResource; the
            // primary_tag segment is validated by the canonical re-check, not
            // the DB query.
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', primary_tag: {slug: 'podcast'}});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:primary_tag/:slug/');

            const result = await service.resolveUrl('/podcast/hello/');
            assert.equal(result.id, 'p1');
            assert.equal(result.type, 'posts');
            sinon.assert.calledWith(findResource, 'posts', {slug: 'hello'});
        });

        it('returns null when the primary_tag segment is not the record canonical tag', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', primary_tag: {slug: 'podcast'}});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:primary_tag/:slug/');

            // The post's canonical URL is /podcast/hello/, so /news/hello/ must
            // 404 exactly as the eager service does.
            assert.equal(await service.resolveUrl('/news/hello/'), null);
        });

        it('matches date-based permalinks when the date is canonical', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', published_at: '2026-04-15T00:00:00.000Z'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year/:month/:slug/');

            const result = await service.resolveUrl('/2026/04/hello/');
            assert.equal(result.id, 'p1');
        });

        it('returns null when the date segments do not match the record published date', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', published_at: '2026-04-15T00:00:00.000Z'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year/:month/:slug/');

            // Post is published in 2026-04, so a 2026-05 URL is not its canonical
            // URL and must 404, matching the eager service.
            assert.equal(await service.resolveUrl('/2026/05/hello/'), null);
        });

        it('does not throw on malformed %-escapes; returns null instead', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            const result = await service.resolveUrl('/foo%ZZ/');
            assert.equal(result, null);
            sinon.assert.notCalled(findResource);
        });

        it('matches literal-prefixed placeholder segments', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {slug: 'hello'}).resolves({id: 'p1', slug: 'hello'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/blog-:slug/');

            const result = await service.resolveUrl('/blog-hello/');
            assert.equal(result.id, 'p1');
            sinon.assert.calledWith(findResource, 'posts', {slug: 'hello'});
        });

        it('matches hyphen-separated multi-token segments (#28076)', async function () {
            const findResource = sinon.stub();
            findResource
                .withArgs('posts', {slug: 'hello'})
                .resolves({id: 'p1', slug: 'hello', published_at: '2026-04-15T00:00:00.000Z'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:year-:month-:day-:slug/');

            const result = await service.resolveUrl('/2026-04-15-hello/');
            assert.equal(result.id, 'p1');
            sinon.assert.calledWith(findResource, 'posts', {slug: 'hello'});
        });

        it('does not resolve a permalink that captures no queryable column', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            // A permalink with neither slug nor id can't identify a resource, so
            // the matcher treats it as no match and the DB is never touched.
            service.onRouterAddedType('archive', null, 'posts', '/:year/:month/');

            assert.equal(await service.resolveUrl('/2026/04/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('does not query findResource when a captured id cannot fit the ObjectId format', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            // `:id` is a real permalink token, but a Ghost id is a 24-char hex
            // ObjectId. A path segment that can't be one is a guaranteed miss,
            // so we skip the lookup eager would also never have a URL for.
            service.onRouterAddedType('default', null, 'posts', '/:id/');

            assert.equal(await service.resolveUrl('/blahblah/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('does not query findResource when a derived date segment cannot fit its format', async function () {
            const findResource = sinon.stub();
            const service = new LazyUrlService({urlUtils, findResource});
            // The slug is queryable here, but a non-numeric year can never be a
            // canonical date segment, so the path is a guaranteed miss — skip
            // the lookup instead of finding the post and failing the re-check.
            service.onRouterAddedType('dated', null, 'posts', '/:year/:month/:slug/');

            assert.equal(await service.resolveUrl('/notayear/04/hello/'), null);
            sinon.assert.notCalled(findResource);
        });

        it('still queries findResource when the captured id is a valid ObjectId', async function () {
            const findResource = sinon.stub();
            findResource.withArgs('posts', {id: '0123456789abcdef01234567'})
                .resolves({id: '0123456789abcdef01234567', slug: 'hello', type: 'post'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:id/');

            const result = await service.resolveUrl('/0123456789abcdef01234567/');
            assert.equal(result.id, '0123456789abcdef01234567');
            sinon.assert.calledOnce(findResource);
        });

        it('uses the singular DB type field to find posts collections', async function () {
            const findResource = sinon.stub();
            findResource.resolves({id: 'p1', slug: 'hello', type: 'post'});

            const service = new LazyUrlService({urlUtils, findResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');

            // Caller (e.g. the entry controller / RSS feed) hands the lazy
            // service a raw DB record with type:'post'. The service should
            // still match the posts collection.
            const url = service.getUrlForResource({type: 'post', id: 'p1', slug: 'hello', status: 'published'});
            assert.equal(url, '/hello/');
        });
    });

    describe('getRequiredRelations', function () {
        it('returns [] when no router references tags or authors', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:slug/');
            service.onRouterAddedType('featured', 'featured:true', 'posts', '/featured/:slug/');

            assert.deepEqual(service.getRequiredRelations(), []);
        });

        it('returns only the relations the registered filters reference', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/news/:slug/');

            assert.deepEqual(service.getRequiredRelations(), ['tags']);
        });

        it('unions relations across all routers and maps primary_* tokens', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/news/:slug/');
            service.onRouterAddedType('staff', 'primary_author:jane', 'posts', '/staff/:slug/');

            assert.deepEqual(service.getRequiredRelations().sort(), ['authors', 'tags']);
        });

        it('requires the relation a permalink derives even when no filter references it', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', null, 'posts', '/:primary_tag/:slug/');

            assert.deepEqual(service.getRequiredRelations(), ['tags']);
        });

        it('requires authors when a permalink derives primary_author', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('default', 'featured:true', 'posts', '/:primary_author/:slug/');

            assert.deepEqual(service.getRequiredRelations(), ['authors']);
        });

        it('recomputes after routers are reset', function () {
            const service = new LazyUrlService({urlUtils, findResource: noopFindResource});
            service.onRouterAddedType('news', 'tag:news', 'posts', '/news/:slug/');
            assert.deepEqual(service.getRequiredRelations(), ['tags']);

            service.reset();
            assert.deepEqual(service.getRequiredRelations(), []);
        });
    });
});
