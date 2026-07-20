const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../utils');
const {waitUntilFinished} = require('../utils/url-service-utils');
const models = require('../../core/server/models');
const urlServiceSingleton = require('../../core/server/services/url');
const UrlService = require('../../core/server/services/url/url-service');
const LazyUrlService = require('../../core/server/services/url/lazy-url-service');
const {UrlServiceFacade} = require('../../core/server/services/url/url-service-facade');
const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');
const inputSerializer = require('../../core/server/api/endpoints/utils/serializers/input/posts');
const postsMapper = require('../../core/server/api/endpoints/utils/serializers/output/mappers/posts');
const memberAttribution = require('../../core/server/services/member-attribution');

// Drives the real Content API serializer pipeline (input serializer → model
// fetch → output mapper → facade) against a lazy backend and compares URLs
// with the eager service, on the /:primary_tag/:slug/ permalinks that produced
// /all/ and /undefined/ divergences in production.
const ROUTES = [
    {identifier: 'primary-tag-collection', filter: null, resourceType: 'posts', permalink: '/:primary_tag/:slug/'},
    {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
    {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
];

describe('Integration: Content API serializer → lazy URL parity (primary_tag permalinks)', function () {
    let eager;
    let lazy;
    let originalFacade;
    const posts = {};

    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.setup('users:roles', 'posts'));

    const EMPTY_LEXICAL = testUtils.DataGenerator.markdownToLexical('parity fixture');

    beforeAll(async function () {
        posts.publicFirst = await models.Post.add({
            title: 'Public First',
            slug: 'public-first',
            status: 'published',
            lexical: EMPTY_LEXICAL,
            tags: [{name: 'Business', slug: 'business'}]
        }, {context: {internal: true}, withRelated: ['tags']});

        posts.internalFirst = await models.Post.add({
            title: 'Internal First',
            slug: 'internal-first',
            status: 'published',
            lexical: EMPTY_LEXICAL,
            tags: [
                {name: '#hidden', slug: 'hash-hidden'},
                {name: 'Visible', slug: 'visible'}
            ]
        }, {context: {internal: true}, withRelated: ['tags']});

        posts.noTags = await models.Post.add({
            title: 'No Tags',
            slug: 'no-tags',
            status: 'published',
            lexical: EMPTY_LEXICAL
        }, {context: {internal: true}});

        eager = new UrlService();
        ROUTES.forEach(r => eager.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));
        eager.init();
        await waitUntilFinished(eager);

        lazy = new LazyUrlService({findResource: createFindResource(models)});
        ROUTES.forEach(r => lazy.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));

        // Route the serializers' singleton facade through the lazy backend.
        originalFacade = urlServiceSingleton.facade;
        urlServiceSingleton.facade = new UrlServiceFacade({urlService: eager, lazyUrlService: lazy});

        // outboundLinkTagger is only wired at boot; stub a pass-through.
        if (!memberAttribution.outboundLinkTagger) {
            memberAttribution.outboundLinkTagger = {addToHtml: async html => html};
        }
    });

    afterAll(function () {
        if (originalFacade) {
            urlServiceSingleton.facade = originalFacade;
        }
        if (eager) {
            eager.reset();
        }
    });
    afterAll(testUtils.teardownDb);

    // Runs the real Content API browse pipeline for one post slug and returns
    // the mapped (serialized) post the API would respond with.
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

        return await postsMapper(page.data[0], frame, {});
    }

    // Compare mode defers the lazy call to setImmediate, by which point the
    // mapper has stripped slug from the shared primary_tag object — so without
    // a snapshot it reports /undefined/ mismatches the sync path never produces.
    describe('compare mode with a mutating serializer pipeline', function () {
        let reports;
        let reportStub;

        beforeAll(function () {
            reportStub = sinon.stub(UrlServiceFacade.prototype, '_report').callsFake(function (error) {
                reports.push(error);
            });
        });

        beforeEach(function () {
            reports = [];
        });

        afterAll(function () {
            reportStub.restore();
        });

        it('does not report a false parity mismatch from post-hoc jsonModel mutation', async function () {
            const compareFacade = new UrlServiceFacade({urlService: eager, lazyUrlService: lazy, compare: true});
            const previousFacade = urlServiceSingleton.facade;
            urlServiceSingleton.facade = compareFacade;

            try {
                const mapped = await browsePipeline({
                    slug: 'public-first',
                    fields: 'title,url,custom_excerpt,html',
                    include: 'tags'
                });
                assert.equal(
                    mapped.url,
                    eager.getUrlByResourceId(posts.publicFirst.id, {absolute: true}),
                    'compare mode must return the eager URL'
                );

                // Flush the setImmediate queue so deferred comparisons run.
                await new Promise((resolve) => {
                    setImmediate(resolve);
                });
                await new Promise((resolve) => {
                    setImmediate(resolve);
                });

                const mismatches = reports.filter(r => r.code === 'LAZY_URL_PARITY_MISMATCH');
                assert.deepEqual(
                    mismatches.map(r => r.errorDetails),
                    [],
                    'deferred comparison reported a mismatch for an in-parity request'
                );
            } finally {
                urlServiceSingleton.facade = previousFacade;
            }
        });
    });

    describe('include=tags combined with ?fields (production /undefined/ shape)', function () {
        ['public-first', 'internal-first', 'no-tags'].forEach(function (slug) {
            it(`${slug} serializes the same URL lazy/eager`, async function () {
                const mapped = await browsePipeline({
                    slug,
                    fields: 'title,url,custom_excerpt,html',
                    include: 'tags'
                });
                const key = {['public-first']: 'publicFirst', ['internal-first']: 'internalFirst', ['no-tags']: 'noTags'}[slug];
                assert.equal(
                    mapped.url,
                    eager.getUrlByResourceId(posts[key].id, {absolute: true}),
                    'lazy URL from include=tags+fields pipeline diverges from eager'
                );
            });
        });
    });

    describe('tag-filtered browse (joins posts_tags)', function () {
        it('tag-filtered ?fields=url browse serializes the same URL lazy/eager', async function () {
            const mapped = await browsePipeline({
                slug: 'internal-first',
                fields: 'id,slug,url',
                filter: 'tag:visible+slug:internal-first'
            });
            assert.equal(
                mapped.url,
                eager.getUrlByResourceId(posts.internalFirst.id, {absolute: true}),
                'lazy URL from tag-filtered serializer pipeline diverges from eager'
            );
        });

        it('tag-filtered full browse serializes the same URL lazy/eager', async function () {
            const mapped = await browsePipeline({
                slug: 'public-first',
                filter: 'tag:business+slug:public-first'
            });
            assert.equal(
                mapped.url,
                eager.getUrlByResourceId(posts.publicFirst.id, {absolute: true}),
                'lazy URL from tag-filtered serializer pipeline diverges from eager'
            );
        });
    });

    ['url', 'id,slug,url', 'title,custom_excerpt,html,url', null].forEach(function (fields) {
        describe(`fields=${fields === null ? '(none — full browse)' : fields}`, function () {
            it('public-first-tag post serializes the same URL lazy/eager', async function () {
                const mapped = await browsePipeline({slug: 'public-first', fields});
                assert.equal(
                    mapped.url,
                    eager.getUrlByResourceId(posts.publicFirst.id, {absolute: true}),
                    'lazy URL from serializer pipeline diverges from eager'
                );
            });

            it('internal-first-tag post serializes the same URL lazy/eager', async function () {
                const mapped = await browsePipeline({slug: 'internal-first', fields});
                assert.equal(
                    mapped.url,
                    eager.getUrlByResourceId(posts.internalFirst.id, {absolute: true}),
                    'lazy URL from serializer pipeline diverges from eager'
                );
            });

            it('untagged post serializes the same URL lazy/eager', async function () {
                const mapped = await browsePipeline({slug: 'no-tags', fields});
                assert.equal(
                    mapped.url,
                    eager.getUrlByResourceId(posts.noTags.id, {absolute: true}),
                    'lazy URL from serializer pipeline diverges from eager'
                );
            });

            it('never serializes an /all/ or /undefined/ URL segment', async function () {
                for (const slug of ['public-first', 'internal-first', 'no-tags']) {
                    const mapped = await browsePipeline({slug, fields});
                    assert.ok(
                        !/\/(undefined)\//.test(mapped.url),
                        `serialized URL contains an unresolved permalink segment: ${mapped.url}`
                    );
                }
            });
        });
    });
});
