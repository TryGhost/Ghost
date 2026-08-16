const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const testUtils = require('../utils');
const models = require('../../core/server/models');
const urlService = require('../../core/server/services/url');
const LazyUrlService = require('../../core/server/services/url/lazy-url-service');
const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');
const inputSerializer = require('../../core/server/api/endpoints/utils/serializers/input/posts');
const postsMapper = require('../../core/server/api/endpoints/utils/serializers/output/mappers/posts');
const memberAttribution = require('../../core/server/services/member-attribution');
const db = require('../../core/server/data/db');

// Drives the real Content API pipeline — input serializer, model fetch, output
// mapper, URL service — over a `/{primary_tag}/{slug}/` permalink, the shape
// that produced /undefined/ URLs in production. A unit test can't cover this:
// the bug was in what the serializers fetch, so it only appears against a real
// database.
const ROUTES = [
    {identifier: 'primary-tag-collection', filter: null, resourceType: 'posts', permalink: '/:primary_tag/:slug/'},
    {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
    {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
];

// Every field shape a caller can ask for. `?fields` strips the record down, so
// each one exercises a different set of columns reaching URL generation.
const FIELD_SHAPES = ['url', 'id,slug,url', 'title,custom_excerpt,html,url', 'title,url,custom_excerpt,html', null];

describe('Integration: Content API URL serialization (primary_tag permalinks)', function () {
    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.setup('users:roles', 'posts'));

    const EMPTY_LEXICAL = testUtils.DataGenerator.markdownToLexical('url serialization fixture');
    let hadOutboundLinkTagger;
    let publicFirst;

    beforeAll(async function () {
        publicFirst = await models.Post.add({
            title: 'Public First',
            slug: 'public-first',
            status: 'published',
            lexical: EMPTY_LEXICAL,
            tags: [{name: 'Business', slug: 'business'}]
        }, {context: {internal: true}, withRelated: ['tags']});

        // An internal (#) tag is attached first. primary_tag is the first tag
        // only when that tag is public, so this post has none — the internal
        // tag must not leak into the URL, and must not fall through to the
        // next public tag either.
        await models.Post.add({
            title: 'Internal First',
            slug: 'internal-first',
            status: 'published',
            lexical: EMPTY_LEXICAL,
            tags: [
                {name: '#hidden', slug: 'hash-hidden'},
                {name: 'Visible', slug: 'visible'}
            ]
        }, {context: {internal: true}, withRelated: ['tags']});

        await models.Post.add({
            title: 'No Tags',
            slug: 'no-tags',
            status: 'published',
            lexical: EMPTY_LEXICAL
        }, {context: {internal: true}});

        urlService.reset();
        ROUTES.forEach(r => urlService.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));

        // outboundLinkTagger is only wired at boot; stub a pass-through. It
        // is a process global, so put it back afterwards.
        hadOutboundLinkTagger = Object.hasOwn(memberAttribution, 'outboundLinkTagger');
        if (!memberAttribution.outboundLinkTagger) {
            memberAttribution.outboundLinkTagger = {addToHtml: async html => html};
        }
    });

    afterAll(function () {
        urlService.reset();
        if (!hadOutboundLinkTagger) {
            delete memberAttribution.outboundLinkTagger;
        }
    });
    afterAll(testUtils.teardownDb);

    // Runs the real Content API browse pipeline for one post and returns the
    // mapped post the API would respond with.
    async function browsePipeline({slug, fields, filter, include}) {
        const frame = {
            apiType: 'content',
            original: {context: {}},
            options: {
                context: {public: true},
                filter: filter || `slug:${slug}`
            }
        };
        if (fields) {
            frame.options.columns = fields.split(',');
        }
        if (include) {
            frame.options.withRelated = include.split(',');
        }

        inputSerializer.browse({}, frame);

        const page = await models.Post.findPage({...frame.options, limit: 'all'});
        assert.equal(page.data.length, 1, `expected exactly one post for slug ${slug}`);

        return postsMapper(page.data[0], frame, {});
    }

    // url-utils substitutes `all` for an absent primary_tag.
    const EXPECTED = {
        'public-first': '/business/public-first/',
        'internal-first': '/all/internal-first/',
        'no-tags': '/all/no-tags/'
    };

    FIELD_SHAPES.forEach(function (fields) {
        describe(`fields=${fields === null ? '(none — full browse)' : fields}`, function () {
            Object.entries(EXPECTED).forEach(function ([slug, path]) {
                it(`serializes ${slug} as ${path}`, async function () {
                    const mapped = await browsePipeline({slug, fields});
                    assert.ok(mapped.url.endsWith(path), `expected a URL ending ${path}, got ${mapped.url}`);
                });
            });

            // The production symptom: a permalink segment the serializer did
            // not fetch the data for renders literally as `undefined`.
            it('never leaves an unresolved permalink segment', async function () {
                for (const slug of Object.keys(EXPECTED)) {
                    const mapped = await browsePipeline({slug, fields});
                    assert.ok(
                        !/\/undefined\//.test(mapped.url),
                        `serialized URL contains an unresolved permalink segment: ${mapped.url}`
                    );
                }
            });
        });
    });

    describe('include=tags combined with ?fields', function () {
        Object.entries(EXPECTED).forEach(function ([slug, path]) {
            it(`serializes ${slug} as ${path}`, async function () {
                const mapped = await browsePipeline({
                    slug,
                    fields: 'title,url,custom_excerpt,html',
                    include: 'tags'
                });
                assert.ok(mapped.url.endsWith(path), `expected a URL ending ${path}, got ${mapped.url}`);
            });
        });
    });

    // A tag-filtered browse joins posts_tags, which changes how the relation
    // is loaded — and so what primary_tag resolves to.
    describe('tag-filtered browse (joins posts_tags)', function () {
        it('serializes the same URL for a ?fields=url tag-filtered browse', async function () {
            const mapped = await browsePipeline({
                slug: 'internal-first',
                fields: 'id,slug,url',
                filter: 'tag:visible+slug:internal-first'
            });
            // Filtering on a tag must not promote it to primary_tag.
            assert.ok(mapped.url.endsWith('/all/internal-first/'), `got ${mapped.url}`);
        });

        it('serializes the same URL for a full tag-filtered browse', async function () {
            const mapped = await browsePipeline({
                slug: 'public-first',
                filter: 'tag:business+slug:public-first'
            });
            assert.ok(mapped.url.endsWith('/business/public-first/'), `got ${mapped.url}`);
        });
    });

    // `findOne` intersects the requested columns with the permitted attributes
    // and — unlike `findPage` — never unions `defaultColumnsToFetch()` back in,
    // so the primary key reaches the query only if the serializer forces it.
    // Without it the mapper hands the URL service `id: undefined` and Bookshelf
    // matches no eager-loaded rows, so the post serializes /404/ with no tags.
    // Regression cases for #29797.
    describe('single-post read with ?fields (findOne drops the primary key)', function () {
        async function readPipeline({slug, id, fields, include}) {
            const frame = {
                apiType: 'content',
                original: {context: {}},
                data: id ? {id} : {slug},
                options: {context: {public: true}}
            };
            if (fields) {
                frame.options.columns = fields.split(',');
            }
            if (include) {
                frame.options.withRelated = include.split(',');
            }

            inputSerializer.read({}, frame);

            const model = await models.Post.findOne(frame.data, frame.options);
            assert.ok(model, `expected a post for ${JSON.stringify(frame.data)}`);

            return postsMapper(model, frame, {});
        }

        it('builds the real URL on a read whose fields omit id', async function () {
            const mapped = await readPipeline({slug: 'public-first', fields: 'title,url,published_at'});

            assert.ok(mapped.url.endsWith('/business/public-first/'), `got ${mapped.url}`);
            assert.doesNotMatch(mapped.url, /\/404\//);
        });

        it('does not leak the forced primary key into the response', async function () {
            const mapped = await readPipeline({slug: 'public-first', fields: 'title,url,published_at'});

            assert.equal(mapped.id, undefined);
        });

        it('keeps the primary key a read looked up by id already returns', async function () {
            // The model already carries the key it was fetched by, so nothing
            // is forced and nothing is stripped.
            const mapped = await readPipeline({id: publicFirst.id, fields: 'title,url'});

            assert.equal(mapped.id, publicFirst.id);
        });

        it('leaves the ids of included relations alone', async function () {
            // The forced columns belong to the post, not to its relations.
            const mapped = await readPipeline({
                slug: 'public-first',
                fields: 'title,url',
                include: 'tags'
            });

            assert.equal(mapped.tags.length, 1);
            assert.ok(mapped.tags[0].id, 'expected the included tag to keep its id');
        });
    });

    // Enumeration, against a real database. Unit tests drive this on stubbed
    // queries, so nothing else checks that the columns and relations the URL
    // service asks for actually come back — which is what the sitemap depends
    // on to build every URL without a second query per row.
    describe('getRoutableResources', function () {
        it('returns the published posts with the relations the permalink reads', async function () {
            const rows = await urlService.getRoutableResources('posts');

            const bySlug = Object.fromEntries(rows.map(row => [row.slug, row]));
            assert.ok(bySlug['public-first'], 'expected the published fixture posts');
            // The /:primary_tag/ permalink reads tags, so they must be loaded
            // — a row without them would build an /undefined/ URL.
            assert.ok(Array.isArray(bySlug['public-first'].tags));
            assert.ok(bySlug['public-first'].tags.some(tag => tag.slug === 'business'));
        });

        it('returns the caller\'s extra columns on top of what URL generation needs', async function () {
            const rows = await urlService.getRoutableResources('posts', {columns: ['feature_image']});

            const row = rows.find(r => r.slug === 'public-first');
            assert.ok(Object.hasOwn(row, 'feature_image'), 'requested column missing');
            assert.ok(Object.hasOwn(row, 'slug'), 'permalink column missing');
            assert.ok(Object.hasOwn(row, 'status'), 'base-filter column missing');
        });

        it('applies each type\'s routing gate', async function () {
            const [posts, pages, tags, authors] = await Promise.all([
                urlService.getRoutableResources('posts'),
                urlService.getRoutableResources('pages'),
                urlService.getRoutableResources('tags'),
                urlService.getRoutableResources('authors')
            ]);

            assert.ok(posts.every(p => p.status === 'published'));
            assert.ok(pages.every(p => p.status === 'published'));
            // Internal (#) tags are never routable.
            assert.ok(!tags.some(t => t.slug === 'hash-hidden'), 'internal tags must not be routable');
            assert.ok(tags.some(t => t.slug === 'business'), 'public tags with posts must be routable');
            assert.ok(authors.length > 0);
        });

        it('rejects a type it has no routing gate for', async function () {
            await assert.rejects(urlService.getRoutableResources('collections'), /collections/);
        });
    });

    // What happens when a caller hands over a resource it under-fetched. In
    // production this is an API endpoint that skipped the URL force-load; the
    // service cannot tell whether the resource routes, so it reports and
    // serves /404/ rather than 500ing the page.
    describe('a resource missing what the routing config reads', function () {
        // A tag-filtered collection, which is the case that needs the relation
        // loaded: an unfiltered /:primary_tag/ permalink renders `all` for a
        // resource with no primary tag rather than failing.
        let filtered;

        beforeAll(function () {
            filtered = new LazyUrlService({findResource: createFindResource(models)});
            filtered.onRouterAddedType('news', 'tag:business', 'posts', '/news/:slug/');
        });

        it('routes a fully-loaded resource', async function () {
            const post = await models.Post.findOne(
                {slug: 'public-first'},
                {context: {internal: true}, withRelated: ['tags']}
            );

            assert.equal(filtered.getUrlForResource({...post.toJSON(), type: 'posts'}), '/news/public-first/');
        });

        it('degrades to /404/ and reports it, rather than throwing', async function () {
            const post = await models.Post.findOne({slug: 'public-first'}, {context: {internal: true}});
            const thin = {type: 'posts', id: post.id, slug: post.get('slug'), status: 'published'};

            const errorStub = sinon.stub(logging, 'error');
            try {
                assert.equal(filtered.getUrlForResource(thin), '/404/');
                sinon.assert.calledOnce(errorStub);
                const report = errorStub.firstCall.args[0];
                assert.equal(report.code, 'LAZY_URL_RESOLUTION_ERROR');
                assert.deepEqual(report.errorDetails.missing, ['tags']);
                assert.deepEqual(report.errorDetails.resourceKeys, ['type', 'id', 'slug', 'status']);
            } finally {
                errorStub.restore();
            }
        });
    });

    // Regression for a production divergence where a post's tags share a
    // sort_order (left behind by bulk/import ops). primary_tag is the first
    // tag if public, so without a tie-break the tag load could order the tied
    // tags differently per query on MySQL, changing the post's URL under a
    // {primary_tag} permalink (seen as /disaster-preparedness/ vs
    // /claremont-elmwood/). The posts_tags.id tie-break pins it to the
    // first-attached public tag. Only diverges on MySQL; on sqlite this pins
    // the expected ordering.
    describe('tied tag sort_order', function () {
        beforeAll(async function () {
            // Two public tags with an internal one between them, all sharing
            // sort_order 0.
            const tiedPost = await models.Post.add({
                title: 'Tied Tags',
                slug: 'tied-tags',
                status: 'published',
                lexical: EMPTY_LEXICAL,
                tags: [
                    {name: 'First Public', slug: 'first-public'},
                    {name: '#internal', slug: 'hash-tied-internal'},
                    {name: 'Second Public', slug: 'second-public'}
                ]
            }, {context: {internal: true}, withRelated: ['tags']});
            await db.knex('posts_tags').where('post_id', tiedPost.id).update({sort_order: 0});
        });

        it('resolves the tie to the first-attached public tag', async function () {
            const mapped = await browsePipeline({slug: 'tied-tags'});
            assert.match(
                mapped.url,
                /\/first-public\//,
                `expected the first attached public tag as primary_tag, got ${mapped.url}`
            );
        });
    });
});
