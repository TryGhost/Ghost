const assert = require('node:assert/strict');
const testUtils = require('../utils');
const models = require('../../core/server/models');
const urlService = require('../../core/server/services/url');
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

    beforeAll(async function () {
        await models.Post.add({
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

        // outboundLinkTagger is only wired at boot; stub a pass-through.
        if (!memberAttribution.outboundLinkTagger) {
            memberAttribution.outboundLinkTagger = {addToHtml: async html => html};
        }
    });

    afterAll(function () {
        urlService.reset();
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
