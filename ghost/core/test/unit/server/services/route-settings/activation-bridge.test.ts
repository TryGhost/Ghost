import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import type {RouteSettings} from '@tryghost/adapter-base-route-settings';
import {buildRouterSettings} from '../../../../../core/server/services/route-settings/activation-bridge';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {buildRouteSettings} from './route-settings-fixture';

// The bridge only reads structural fields — raw objects built inline have no
// YAML text behind them, so an empty source is attached.
const parse = (raw: unknown) => parseRouteSettings(raw, '');

function empty() {
    return buildRouteSettings({routes: [], collections: [], taxonomies: {}});
}

describe('activation-bridge', function () {
    describe('buildRouterSettings', function () {
        it('returns empty arrays for empty settings', function () {
            assert.deepEqual(buildRouterSettings(empty()), {
                routes: [],
                collections: [],
                taxonomies: []
            });
        });

        // Characterisation tests for the router-facing array output. Each item
        // carries its own `path`; routes use the domain `type`/`contentType`
        // names; permalinks are already in `:slug` notation and `data` is still
        // expanded to `{query, router}` (peeled off in later cleanup PRs).
        describe('produces the expected array output', function () {
            const cases: Array<{name: string; raw: unknown; expected: object}> = [
                {
                    name: 'bare string template route',
                    raw: {routes: {'/about/': 'about'}, collections: {}, taxonomies: {}},
                    expected: {routes: [{path: '/about/', type: 'template', templates: ['about']}], collections: [], taxonomies: []}
                },
                {
                    name: 'template route with content_type maps to contentType',
                    raw: {routes: {'/api/': {template: 'api', content_type: 'application/json'}}, collections: {}, taxonomies: {}},
                    expected: {routes: [{path: '/api/', type: 'template', templates: ['api'], contentType: 'application/json'}], collections: [], taxonomies: []}
                },
                {
                    name: 'channel route keeps type: channel',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured'}}, collections: {}, taxonomies: {}},
                    expected: {routes: [{path: '/featured/', type: 'channel', templates: ['featured'], filter: 'featured:true'}], collections: [], taxonomies: []}
                },
                {
                    name: 'channel route with rss disabled',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: false}}, collections: {}, taxonomies: {}},
                    expected: {routes: [{path: '/featured/', type: 'channel', templates: [], filter: 'featured:true', rss: false}], collections: [], taxonomies: []}
                },
                {
                    name: 'route with shortform data expands to {query, router}',
                    raw: {routes: {'/food/': {template: 'food', data: 'tag.food'}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: [{
                            path: '/food/',
                            type: 'template',
                            templates: ['food'],
                            data: {
                                query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'food', visibility: 'public'}}},
                                router: {tags: [{slug: 'food', redirect: true}]}
                            }
                        }],
                        collections: [],
                        taxonomies: []
                    }
                },
                {
                    name: 'collection with permalink converts {slug} to :slug',
                    raw: {routes: {}, collections: {'/': {permalink: '/{slug}/', template: 'index'}}, taxonomies: {}},
                    expected: {routes: [], collections: [{path: '/', permalink: '/:slug/', templates: ['index']}], taxonomies: []}
                },
                {
                    name: 'collection with filter and data',
                    raw: {routes: {}, collections: {'/podcast/': {permalink: '/podcast/{slug}/', filter: 'tag:podcast', template: 'podcast', data: 'tag.podcast'}}, taxonomies: {}},
                    expected: {
                        routes: [],
                        collections: [{
                            path: '/podcast/',
                            permalink: '/podcast/:slug/',
                            templates: ['podcast'],
                            data: {
                                query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'podcast', visibility: 'public'}}},
                                router: {tags: [{slug: 'podcast', redirect: true}]}
                            },
                            filter: 'tag:podcast'
                        }],
                        taxonomies: []
                    }
                },
                {
                    name: 'taxonomies become {key, permalink} entries in :slug notation',
                    raw: {routes: {}, collections: {}, taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}},
                    expected: {routes: [], collections: [], taxonomies: [{key: 'tag', permalink: '/tag/:slug/'}, {key: 'author', permalink: '/author/:slug/'}]}
                },
                {
                    name: 'channel route copies order and limit',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', order: 'published_at desc', limit: 3}}, collections: {}, taxonomies: {}},
                    expected: {routes: [{path: '/featured/', type: 'channel', templates: [], filter: 'featured:true', order: 'published_at desc', limit: 3}], collections: [], taxonomies: []}
                },
                {
                    name: 'collection copies order, limit and rss',
                    raw: {routes: {}, collections: {'/': {permalink: '/{slug}/', template: 'index', order: 'published_at asc', limit: 10, rss: false}}, taxonomies: {}},
                    expected: {routes: [], collections: [{path: '/', permalink: '/:slug/', templates: ['index'], order: 'published_at asc', limit: 10, rss: false}], taxonomies: []}
                }
            ];

            cases.forEach(({name, raw, expected}) => {
                it(name, function () {
                    assert.deepEqual(buildRouterSettings(parse(raw)), expected);
                });
            });
        });

        it('omits data when no data specified', function () {
            const settings = buildRouteSettings({
                routes: [{type: 'template', path: '/about/', templates: ['about']}],
                collections: [],
                taxonomies: {}
            });

            assert.equal(buildRouterSettings(settings).routes[0].data, undefined);
        });

        it('drops taxonomies with an empty permalink', function () {
            const settings: RouteSettings = {routes: [], collections: [], taxonomies: {tag: ''}, yamlSource: ''};

            assert.deepEqual(buildRouterSettings(settings).taxonomies, []);
        });
    });

    describe('determinism', function () {
        // buildRouterSettings feeds the schema integrity canary, which md5s its
        // output, so the same config must always serialize identically —
        // regardless of the order the operator wrote the properties in.
        const complexConfig = {
            routes: {
                '/about/': 'about',
                '/api/': {template: 'api', content_type: 'application/json'},
                '/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured', rss: true, data: 'tag.featured'},
                '/reader/': {template: 'reader', data: {entry: {type: 'read', resource: 'posts', slug: 'welcome', redirect: false}}}
            },
            collections: {
                '/': {permalink: '/{primary_author}/{slug}/', template: 'index'},
                '/podcast/': {permalink: '/podcast/{slug}/', template: 'podcast', filter: 'tag:podcast', rss: false}
            },
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };

        it('serializes identically across repeated parses of the same config', function () {
            const first = buildRouterSettings(parse(structuredClone(complexConfig)));
            const second = buildRouterSettings(parse(structuredClone(complexConfig)));

            assert.equal(JSON.stringify(first), JSON.stringify(second));
        });

        it('serializes identically when the operator orders route properties differently', function () {
            const orderedOneWay = {
                routes: {'/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured', rss: true, data: 'tag.featured'}},
                collections: {'/': {permalink: '/{slug}/', template: 'index'}},
                taxonomies: {}
            };
            const orderedAnotherWay = {
                routes: {'/featured/': {data: 'tag.featured', rss: true, template: 'featured', filter: 'featured:true', controller: 'channel'}},
                collections: {'/': {template: 'index', permalink: '/{slug}/'}},
                taxonomies: {}
            };

            const first = buildRouterSettings(parse(orderedOneWay));
            const second = buildRouterSettings(parse(orderedAnotherWay));

            assert.equal(JSON.stringify(first), JSON.stringify(second));
        });
    });
});
