import assert from 'node:assert/strict';
import {parseRouteSettings, serializeRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import type {RouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

describe('UNIT: services/route-settings/route-settings-parser', function () {
    describe('parseRouteSettings', function () {
        it('handles null/undefined input', function () {
            assert.deepEqual(parseRouteSettings(null), {routes: [], collections: [], taxonomies: {}});
            assert.deepEqual(parseRouteSettings(undefined), {routes: [], collections: [], taxonomies: {}});
        });

        it('handles empty object', function () {
            assert.deepEqual(parseRouteSettings({}), {routes: [], collections: [], taxonomies: {}});
        });

        it('handles empty sections', function () {
            assert.deepEqual(parseRouteSettings({routes: null, collections: null, taxonomies: null}), {
                routes: [], collections: [], taxonomies: {}
            });
        });

        describe('routes', function () {
            it('parses bare string route as template route', function () {
                const result = parseRouteSettings({
                    routes: {'/about/': 'about'}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/about/', templates: ['about']}
                ]);
            });

            it('parses object route with template string', function () {
                const result = parseRouteSettings({
                    routes: {'/me/': {template: 'me'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/me/', templates: ['me']}
                ]);
            });

            it('parses object route with template array', function () {
                const result = parseRouteSettings({
                    routes: {'/about/': {template: ['about', 'default']}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/about/', templates: ['about', 'default']}
                ]);
            });

            it('parses template route with no template key as empty templates', function () {
                const result = parseRouteSettings({
                    routes: {'/rss/': {content_type: 'text/xml'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/rss/', templates: [], contentType: 'text/xml'}
                ]);
            });

            it('parses route with data', function () {
                const result = parseRouteSettings({
                    routes: {'/food/': {template: 'food', data: 'tag.food'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/food/', templates: ['food'], data: 'tag.food'}
                ]);
            });

            it('detects channel route via controller: channel', function () {
                const result = parseRouteSettings({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true'}
                ]);
            });

            it('leaves rss unset on channel route when not specified', function () {
                const result = parseRouteSettings({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true'}}
                });

                assert.equal(Object.prototype.hasOwnProperty.call(result.routes[0], 'rss'), false);
            });

            it('respects explicit rss: true on channel route', function () {
                const result = parseRouteSettings({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: true}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: true}
                ]);
            });

            it('treats route with filter but no controller as template route', function () {
                const result = parseRouteSettings({
                    routes: {'/latest/': {template: 'latest', filter: 'featured:true'}}
                });

                assert.equal(result.routes[0].type, 'template');
            });

            it('respects explicit rss: false on channel route', function () {
                const result = parseRouteSettings({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: false}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: false}
                ]);
            });

            it('parses channel route with all properties', function () {
                const result = parseRouteSettings({
                    routes: {
                        '/channel/': {
                            controller: 'channel',
                            filter: 'tag:channel',
                            order: 'published_at desc',
                            limit: 10,
                            template: 'channel',
                            data: 'tag.channel',
                            rss: true
                        }
                    }
                });

                assert.deepEqual(result.routes, [{
                    type: 'channel',
                    path: '/channel/',
                    templates: ['channel'],
                    filter: 'tag:channel',
                    order: 'published_at desc',
                    limit: 10,
                    data: 'tag.channel',
                    rss: true
                }]);
            });

            it('parses multiple routes preserving order', function () {
                const result = parseRouteSettings({
                    routes: {
                        '/about/': 'about',
                        '/contact/': 'contact',
                        '/featured/': {controller: 'channel', filter: 'featured:true'}
                    }
                });

                assert.equal(result.routes.length, 3);
                assert.equal(result.routes[0].path, '/about/');
                assert.equal(result.routes[1].path, '/contact/');
                assert.equal(result.routes[2].path, '/featured/');
            });
        });

        describe('collections', function () {
            it('parses basic collection', function () {
                const result = parseRouteSettings({
                    collections: {'/': {permalink: '/{slug}/'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: []}
                ]);
            });

            it('parses collection with template', function () {
                const result = parseRouteSettings({
                    collections: {'/': {permalink: '/{slug}/', template: 'index'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: ['index']}
                ]);
            });

            it('parses collection with all properties', function () {
                const result = parseRouteSettings({
                    collections: {
                        '/podcast/': {
                            permalink: '/podcast/{slug}/',
                            template: ['podcast', 'index'],
                            filter: 'tag:podcast',
                            order: 'published_at desc',
                            limit: 12,
                            rss: false,
                            data: 'tag.podcast'
                        }
                    }
                });

                assert.deepEqual(result.collections, [{
                    path: '/podcast/',
                    permalink: '/podcast/{slug}/',
                    templates: ['podcast', 'index'],
                    filter: 'tag:podcast',
                    order: 'published_at desc',
                    limit: 12,
                    rss: false,
                    data: 'tag.podcast'
                }]);
            });

            it('parses multiple collections', function () {
                const result = parseRouteSettings({
                    collections: {
                        '/podcast/': {permalink: '/podcast/{slug}/'},
                        '/': {permalink: '/{slug}/'}
                    }
                });

                assert.equal(result.collections.length, 2);
                assert.equal(result.collections[0].path, '/podcast/');
                assert.equal(result.collections[1].path, '/');
            });
        });

        describe('taxonomies', function () {
            it('parses taxonomies', function () {
                const result = parseRouteSettings({
                    taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
                });

                assert.deepEqual(result.taxonomies, {
                    tag: '/tag/{slug}/',
                    author: '/author/{slug}/'
                });
            });

            it('parses partial taxonomies', function () {
                const result = parseRouteSettings({
                    taxonomies: {tag: '/categories/{slug}/'}
                });

                assert.deepEqual(result.taxonomies, {tag: '/categories/{slug}/'});
            });
        });

        describe('data passthrough', function () {
            it('preserves data shortform string', function () {
                const result = parseRouteSettings({
                    routes: {'/food/': {template: 'food', data: 'tag.food'}}
                });

                assert.equal(result.routes[0].data, 'tag.food');
            });

            it('preserves data longform object', function () {
                const data = {
                    featured: {resource: 'posts', type: 'browse', filter: 'featured:true'},
                    main_tag: 'tag.getting-started'
                };
                const result = parseRouteSettings({
                    routes: {'/featured/': {template: 'featured', data}}
                });

                assert.deepEqual(result.routes[0].data, data);
            });
        });

        describe('keeps {slug} notation', function () {
            it('does not convert {slug} to :slug in collection permalink', function () {
                const result = parseRouteSettings({
                    collections: {'/': {permalink: '/{slug}/'}}
                });

                assert.equal(result.collections[0].permalink, '/{slug}/');
            });

            it('does not convert {slug} to :slug in taxonomy', function () {
                const result = parseRouteSettings({
                    taxonomies: {tag: '/tag/{slug}/'}
                });

                assert.equal(result.taxonomies.tag, '/tag/{slug}/');
            });
        });

        describe('default-routes.yaml', function () {
            it('correctly parses the default routes.yaml content', function () {
                const result = parseRouteSettings({
                    routes: null,
                    collections: {'/': {permalink: '/{slug}/', template: 'index'}},
                    taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
                });

                assert.deepEqual(result, {
                    routes: [],
                    collections: [{
                        path: '/',
                        permalink: '/{slug}/',
                        templates: ['index']
                    }],
                    taxonomies: {
                        tag: '/tag/{slug}/',
                        author: '/author/{slug}/'
                    }
                });
            });
        });
    });

    describe('serializeRouteSettings', function () {
        it('serializes empty settings', function () {
            const settings: RouteSettings = {routes: [], collections: [], taxonomies: {}};
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('routes: null'));
            assert.ok(yaml.includes('collections: null'));
            assert.ok(yaml.includes('taxonomies: null'));
        });

        it('serializes simple template route as bare string', function () {
            const settings: RouteSettings = {
                routes: [{type: 'template', path: '/about/', templates: ['about']}],
                collections: [],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('/about/: about'));
        });

        it('serializes channel route as object with controller: channel', function () {
            const settings: RouteSettings = {
                routes: [{
                    type: 'channel',
                    path: '/featured/',
                    templates: ['featured'],
                    filter: 'featured:true',
                    rss: true
                }],
                collections: [],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('/featured/:'));
            assert.ok(yaml.includes('template: featured'));
            assert.ok(yaml.includes('controller: channel'));
            assert.ok(yaml.includes('filter: featured:true'));
        });

        it('does not emit rss when unset (default)', function () {
            const settings: RouteSettings = {
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f'}],
                collections: [],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(!yaml.includes('rss:'));
        });

        it('emits rss when explicitly true', function () {
            const settings: RouteSettings = {
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f', rss: true}],
                collections: [],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('rss: true'));
        });

        it('emits rss when false', function () {
            const settings: RouteSettings = {
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f', rss: false}],
                collections: [],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('rss: false'));
        });

        it('serializes collection', function () {
            const settings: RouteSettings = {
                routes: [],
                collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
                taxonomies: {}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('permalink: /{slug}/'));
            assert.ok(yaml.includes('template: index'));
        });

        it('serializes taxonomies', function () {
            const settings: RouteSettings = {
                routes: [],
                collections: [],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            };
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('tag: /tag/{slug}/'));
            assert.ok(yaml.includes('author: /author/{slug}/'));
        });

        it('roundtrips through parse → serialize → parse', function () {
            const original: RouteSettings = {
                routes: [
                    {type: 'template', path: '/about/', templates: ['about']},
                    {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true', rss: true, data: 'tag.featured'}
                ],
                collections: [
                    {path: '/', permalink: '/{slug}/', templates: ['index']},
                    {path: '/podcast/', permalink: '/podcast/{slug}/', templates: ['podcast'], filter: 'tag:podcast'}
                ],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            };

            const yamlStr = serializeRouteSettings(original);
            const reparsed = parseRouteSettings(require('js-yaml').load(yamlStr));

            assert.deepEqual(reparsed, original);
        });

        it('roundtrips through yaml → parse → serialize → yaml', function () {
            const originalYaml = [
                'routes:',
                '  /about/: about',
                '  /featured/:',
                '    template: featured',
                '    controller: channel',
                '    filter: featured:true',
                'collections:',
                '  /:',
                '    permalink: /{slug}/',
                '    template: index',
                '  /podcast/:',
                '    permalink: /podcast/{slug}/',
                '    template: podcast',
                '    filter: tag:podcast',
                'taxonomies:',
                '  tag: /tag/{slug}/',
                '  author: /author/{slug}/',
                ''
            ].join('\n');

            const parsed = parseRouteSettings(require('js-yaml').load(originalYaml));
            const reserialized = serializeRouteSettings(parsed);

            assert.equal(reserialized, originalYaml);
        });

        it('roundtrips the sample routes.yaml from Downloads', function () {
            const raw = {
                routes: {
                    '/signup/': 'members/signup',
                    '/signin/': 'members/signin',
                    '/account/': 'members/account'
                },
                collections: {'/': {permalink: '/{slug}/', template: 'index'}},
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            };

            const parsed = parseRouteSettings(raw);
            const yamlStr = serializeRouteSettings(parsed);
            const reparsed = parseRouteSettings(require('js-yaml').load(yamlStr));

            assert.deepEqual(reparsed, parsed);
        });
    });
});
