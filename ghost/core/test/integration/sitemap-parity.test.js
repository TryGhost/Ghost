const assert = require('node:assert/strict');
const testUtils = require('../utils');
const {waitUntilFinished} = require('../utils/url-service-utils');
const models = require('../../core/server/models');
const UrlService = require('../../core/server/services/url/url-service');
const LazyUrlService = require('../../core/server/services/url/lazy-url-service');
const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');
const {createFetchRoutableResources} = require('../../core/server/services/url/routable-resources');

const RESOURCE_TYPES = ['posts', 'pages', 'tags', 'authors'];

// The sitemap's own skip rule: resources no router owns resolve to /404/.
const emittedInSitemap = url => url && !url.includes('/404/');

// The sitemap must emit the same URL set whether it is fed by the eager URL
// service's events or built from routable-resources enumeration. The eager
// service's boot-time cache is the oracle: everything it caches (and routes)
// belongs in the sitemap, everything else does not.
//
// This pins the enumeration (filters, has-posts gates, loaded relations)
// against the eager resource configs with a real database, which unit tests
// on stubbed queries cannot do.
const SCENARIOS = [
    {
        name: 'default routing set',
        routes: [
            {identifier: 'posts-router', filter: null, resourceType: 'posts', permalink: '/:slug/'},
            {identifier: 'pages-router', filter: null, resourceType: 'pages', permalink: '/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
        ]
    },
    {
        name: 'primary_tag permalinks need the tags relation loaded',
        routes: [
            {identifier: 'posts-router', filter: null, resourceType: 'posts', permalink: '/:primary_tag/:slug/'},
            {identifier: 'pages-router', filter: null, resourceType: 'pages', permalink: '/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
        ]
    },
    {
        // primary_author is set by the Post authors-relation serializer
        // inside raw-knex toJSON; this pins that guarantee against a real
        // database, since the enumeration itself adds nothing for it.
        name: 'primary_author permalinks need the authors relation loaded',
        routes: [
            {identifier: 'posts-router', filter: null, resourceType: 'posts', permalink: '/:primary_author/:slug/'},
            {identifier: 'pages-router', filter: null, resourceType: 'pages', permalink: '/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
        ]
    }
];

describe('Integration: sitemap eager/lazy parity', function () {
    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.setup('users:roles', 'posts'));
    beforeAll(async function () {
        // A public tag with no posts: the has-posts gate must keep it out of
        // the enumeration the same way eager's shouldHavePosts keeps it out
        // of the cache. Explicit so the case does not depend on fixture
        // makeup.
        await models.Tag.add(
            {name: 'Sitemap Orphan Tag', slug: 'sitemap-orphan-tag'},
            {context: {internal: true}}
        );
    });
    afterAll(testUtils.teardownDb);

    SCENARIOS.forEach(function (scenario) {
        describe(scenario.name, function () {
            let eager;
            let lazy;
            let fetchRoutableResources;

            beforeAll(async function () {
                eager = new UrlService();
                scenario.routes.forEach(r => eager.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));
                eager.init();
                await waitUntilFinished(eager);

                lazy = new LazyUrlService({findResource: createFindResource(models)});
                scenario.routes.forEach(r => lazy.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));
                fetchRoutableResources = createFetchRoutableResources({lazyUrlService: lazy});
            });

            afterAll(function () {
                eager.reset();
            });

            it('enumeration produces the same URL set as the eager cache', async function () {
                for (const type of RESOURCE_TYPES) {
                    // What the lazy sitemap build would emit: enumerated rows
                    // through the lazy backend.
                    const rows = await fetchRoutableResources(type);
                    const lazyUrls = rows
                        .map(datum => lazy.getUrlForResource({...datum, type}))
                        .filter(emittedInSitemap);

                    // What the event-fed sitemap holds: every cached eager
                    // resource, through the eager URL map.
                    const eagerUrls = (eager.resources.getAllByType(type) || [])
                        .map(resource => eager.getUrlByResourceId(resource.data.id))
                        .filter(emittedInSitemap);

                    assert.deepEqual(
                        [...lazyUrls].sort(),
                        [...eagerUrls].sort(),
                        `URL set mismatch for ${type}`
                    );

                    if (type === 'posts') {
                        assert.ok(rows.length > 0, 'expected fixture posts so the comparison is not vacuous');
                    }
                }
            });
        });
    });
});
