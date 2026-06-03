const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../utils');
const models = require('../../core/server/models');
const db = require('../../core/server/data/db');
const UrlService = require('../../core/server/services/url/url-service');
const LazyUrlService = require('../../core/server/services/url/lazy-url-service');
const {createFindResource} = require('../../core/server/services/url/lazy-find-resource');

const RESOURCE_TYPES = ['posts', 'pages', 'tags', 'authors'];

// Routing sets registered identically on both services. Slug-backed permalinks
// only, since that is Ghost's default shape and the one resolveUrl queries by.
const SCENARIOS = [
    {
        name: 'default routing set',
        routes: [
            {identifier: 'posts-router', filter: 'featured:false', resourceType: 'posts', permalink: '/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'pages-router', filter: null, resourceType: 'pages', permalink: '/:slug/'}
        ]
    },
    {
        name: 'featured collection with priority fallthrough',
        routes: [
            {identifier: 'featured-router', filter: 'featured:true', resourceType: 'posts', permalink: '/featured/:slug/'},
            {identifier: 'posts-router', filter: null, resourceType: 'posts', permalink: '/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
        ]
    },
    {
        name: 'date-based post permalinks',
        routes: [
            {identifier: 'posts-router', filter: null, resourceType: 'posts', permalink: '/:year/:month/:slug/'},
            {identifier: 'tags-router', filter: null, resourceType: 'tags', permalink: '/tag/:slug/'},
            {identifier: 'authors-router', filter: null, resourceType: 'authors', permalink: '/author/:slug/'}
        ]
    }
];

function waitUntilFinished(urlService, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function retry() {
            if (urlService.hasFinished()) {
                return resolve();
            }
            if (Date.now() - start > timeout) {
                return reject(new Error('Eager UrlService did not finish in time'));
            }
            setTimeout(retry, 50);
        })();
    });
}

describe('Integration: eager/lazy URL service parity', function () {
    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    after(testUtils.teardownDb);

    after(function () {
        sinon.restore();
    });

    SCENARIOS.forEach(function (scenario) {
        describe(scenario.name, function () {
            let eager;
            let lazy;

            before(async function () {
                eager = new UrlService();
                scenario.routes.forEach(r => eager.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));
                eager.init();
                await waitUntilFinished(eager);

                lazy = new LazyUrlService({findResource: createFindResource(models)});
                scenario.routes.forEach(r => lazy.onRouterAddedType(r.identifier, r.filter, r.resourceType, r.permalink));
            });

            after(function () {
                eager.reset();
            });

            function cachedResourcesByType() {
                return RESOURCE_TYPES.map(type => ({
                    type,
                    resources: eager.resources.getAllByType(type) || []
                }));
            }

            function allGeneratedUrls() {
                const urls = [];
                eager.urlGenerators.forEach((generator) => {
                    generator.getUrls().forEach((entry) => {
                        urls.push({url: entry.url, id: entry.resource.data.id});
                    });
                });
                return urls;
            }

            it('loaded a non-trivial fixture set so the comparison is not vacuous', function () {
                const total = cachedResourcesByType().reduce((sum, group) => sum + group.resources.length, 0);
                assert.ok(total > 0, 'expected the eager service to cache at least one resource');
                assert.ok(allGeneratedUrls().length > 0, 'expected the eager service to generate at least one url');
            });

            it('forward lookup returns the same relative URL for every cached resource', function () {
                for (const {type, resources} of cachedResourcesByType()) {
                    for (const resource of resources) {
                        const id = resource.data.id;
                        const lazyResource = Object.assign({}, resource.data, {type});

                        assert.equal(
                            lazy.getUrlForResource(lazyResource),
                            eager.getUrlByResourceId(id),
                            `relative URL mismatch for ${type} ${id}`
                        );
                    }
                }
            });

            it('forward lookup returns the same absolute URL for every cached resource', function () {
                for (const {type, resources} of cachedResourcesByType()) {
                    for (const resource of resources) {
                        const id = resource.data.id;
                        const lazyResource = Object.assign({}, resource.data, {type});

                        assert.equal(
                            lazy.getUrlForResource(lazyResource, {absolute: true}),
                            eager.getUrlByResourceId(id, {absolute: true}),
                            `absolute URL mismatch for ${type} ${id}`
                        );
                    }
                }
            });

            it('agrees with the eager service on which router owns each resource', function () {
                for (const {type, resources} of cachedResourcesByType()) {
                    for (const resource of resources) {
                        const id = resource.data.id;
                        const lazyResource = Object.assign({}, resource.data, {type});

                        for (const route of scenario.routes) {
                            assert.equal(
                                lazy.ownsResource(route.identifier, lazyResource),
                                eager.owns(route.identifier, id),
                                `ownership mismatch for router ${route.identifier} and ${type} ${id}`
                            );
                        }
                    }
                }
            });

            it('reverse lookup resolves every eager-generated URL to the same resource', async function () {
                for (const {url, id} of allGeneratedUrls()) {
                    const eagerEnvelope = eager.getResource(url);
                    const resolved = await lazy.resolveUrl(url);

                    assert.ok(resolved, `lazy resolveUrl returned null for ${url}`);
                    assert.equal(resolved.id, id, `resolved id mismatch for ${url}`);
                    assert.equal(resolved.type, eagerEnvelope.config.type, `resolved type mismatch for ${url}`);
                }
            });

            it('reverse lookup returns the same record shape as the eager service', async function () {
                for (const {url} of allGeneratedUrls()) {
                    const eagerEnvelope = eager.getResource(url);
                    const eagerFlat = Object.assign({}, eagerEnvelope.data, {type: eagerEnvelope.config.type});
                    const resolved = await lazy.resolveUrl(url);

                    // Exact field-set parity guards against lazy leaking fields the
                    // eager backend strips (e.g. title/html/mobiledoc on posts,
                    // email on authors), which would change downstream behaviour.
                    assert.deepEqual(
                        Object.keys(resolved).sort(),
                        Object.keys(eagerFlat).sort(),
                        `field-set mismatch for ${url}`
                    );

                    assert.equal(resolved.slug, eagerFlat.slug, `slug mismatch for ${url}`);
                    if ('name' in eagerFlat) {
                        assert.equal(resolved.name, eagerFlat.name, `name mismatch for ${url}`);
                    }
                    assert.ok(!('title' in resolved), `lazy leaked title for ${url}`);

                    // Relations stay trimmed to {id, slug} like eager's withRelatedFields.
                    for (const key of ['tags', 'authors']) {
                        if (Array.isArray(resolved[key])) {
                            resolved[key].forEach((relation) => {
                                assert.deepEqual(
                                    Object.keys(relation).sort(),
                                    ['id', 'slug'],
                                    `${key} relation not trimmed for ${url}`
                                );
                            });
                        }
                    }
                }
            });

            it('reverse lookup returns null for an unknown URL, like the eager service', async function () {
                assert.equal(eager.getResource('/this-does-not-exist/'), null);
                assert.equal(await lazy.resolveUrl('/this-does-not-exist/'), null);
            });

            it('does not resolve public tags/authors with no posts, like the eager service', async function () {
                // Eager only caches tags/authors that pass shouldHavePosts, so any
                // public row absent from its cache is a zero-published-post resource
                // the gate hides. Lazy must hide it too or it exposes non-public URLs.
                const gated = [
                    {type: 'tags', table: 'tags'},
                    {type: 'authors', table: 'users'}
                ];

                let checked = 0;
                for (const {type, table} of gated) {
                    const router = scenario.routes.find(r => r.resourceType === type);
                    if (!router) {
                        continue;
                    }

                    const cachedIds = new Set((eager.resources.getAllByType(type) || []).map(r => r.data.id));
                    const publicRows = await db.knex(table).where('visibility', 'public').select('id', 'slug');
                    const orphan = publicRows.find(row => !cachedIds.has(row.id));
                    if (!orphan) {
                        continue;
                    }

                    const url = router.permalink.replace(':slug', orphan.slug);
                    assert.equal(eager.getResource(url), null, `eager resolved zero-post ${type} ${url}`);
                    assert.equal(await lazy.resolveUrl(url), null, `lazy resolved zero-post ${type} ${url}`);
                    checked += 1;
                }

                assert.ok(checked > 0, 'expected at least one zero-post public tag or author in fixtures');
            });

            if (scenario.routes.some(r => r.permalink.includes(':year'))) {
                it('agrees with the eager service that a non-canonical (wrong-date) URL 404s', async function () {
                    let checked = 0;
                    for (const {url} of allGeneratedUrls()) {
                        const yearMatch = url.match(/^\/(\d{4})\//);
                        if (!yearMatch) {
                            continue;
                        }
                        // Swap the year for one the post wasn't published in: a
                        // valid permalink shape that is not this post's canonical
                        // URL, so both services must reject it.
                        const variant = url.replace(/^\/\d{4}\//, `/${Number(yearMatch[1]) - 1}/`);

                        assert.equal(eager.getResource(variant), null, `eager resolved non-canonical ${variant}`);
                        assert.equal(await lazy.resolveUrl(variant), null, `lazy resolved non-canonical ${variant}`);
                        checked += 1;
                    }
                    assert.ok(checked > 0, 'expected at least one date-based URL to mutate');
                });
            }
        });
    });
});
