import assert from 'node:assert/strict';
import {parseRouteSettings, serializeRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {buildRouteSettings} from './route-settings-fixture';

// The raw objects here have no YAML text behind them, so an empty source is attached.
const parse = (raw: unknown) => parseRouteSettings(raw, '');

describe('UNIT: services/route-settings/route-settings-parser', function () {
    describe('parseRouteSettings', function () {
        it('handles null/undefined input', function () {
            assert.deepEqual(parse(null), {routes: [], collections: [], taxonomies: {}, yamlSource: ''});
            assert.deepEqual(parse(undefined), {routes: [], collections: [], taxonomies: {}, yamlSource: ''});
        });

        it('handles empty object', function () {
            assert.deepEqual(parse({}), {routes: [], collections: [], taxonomies: {}, yamlSource: ''});
        });

        it('handles empty sections', function () {
            assert.deepEqual(parse({routes: null, collections: null, taxonomies: null}), {
                routes: [], collections: [], taxonomies: {}, yamlSource: ''
            });
        });

        describe('routes', function () {
            it('parses bare string route as template route', function () {
                const result = parse({
                    routes: {'/about/': 'about'}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/about/', templates: ['about']}
                ]);
            });

            it('parses object route with template string', function () {
                const result = parse({
                    routes: {'/me/': {template: 'me'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/me/', templates: ['me']}
                ]);
            });

            it('parses object route with template array', function () {
                const result = parse({
                    routes: {'/about/': {template: ['about', 'default']}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/about/', templates: ['about', 'default']}
                ]);
            });

            it('parses template route with no template key as empty templates', function () {
                const result = parse({
                    routes: {'/rss/': {content_type: 'text/xml'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/rss/', templates: [], contentType: 'text/xml'}
                ]);
            });

            it('parses route with data', function () {
                const result = parse({
                    routes: {'/food/': {template: 'food', data: 'tag.food'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/food/', templates: ['food'], data: 'tag.food'}
                ]);
            });

            it('detects channel route via controller: channel', function () {
                const result = parse({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true'}
                ]);
            });

            it('leaves rss unset on channel route when not specified', function () {
                const result = parse({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true'}}
                });

                assert.equal(Object.prototype.hasOwnProperty.call(result.routes[0], 'rss'), false);
            });

            it('respects explicit rss: true on channel route', function () {
                const result = parse({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: true}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: true}
                ]);
            });

            it('treats route with filter but no controller as template route', function () {
                const result = parse({
                    routes: {'/latest/': {template: 'latest', filter: 'featured:true'}}
                });

                assert.equal(result.routes[0].type, 'template');
            });

            it('respects explicit rss: false on channel route', function () {
                const result = parse({
                    routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: false}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: false}
                ]);
            });

            it('parses channel route with all properties', function () {
                const result = parse({
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
                const result = parse({
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
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: []}
                ]);
            });

            it('parses collection with template', function () {
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/', template: 'index'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: ['index']}
                ]);
            });

            it('parses collection with all properties', function () {
                const result = parse({
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
                const result = parse({
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
                const result = parse({
                    taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
                });

                assert.deepEqual(result.taxonomies, {
                    tag: '/tag/{slug}/',
                    author: '/author/{slug}/'
                });
            });

            it('parses partial taxonomies', function () {
                const result = parse({
                    taxonomies: {tag: '/categories/{slug}/'}
                });

                assert.deepEqual(result.taxonomies, {tag: '/categories/{slug}/'});
            });
        });

        describe('data passthrough', function () {
            it('preserves data shortform string', function () {
                const result = parse({
                    routes: {'/food/': {template: 'food', data: 'tag.food'}}
                });

                assert.equal(result.routes[0].data, 'tag.food');
            });

            it('preserves data longform object', function () {
                const data = {
                    featured: {resource: 'posts', type: 'browse', filter: 'featured:true'},
                    main_tag: 'tag.getting-started'
                };
                const result = parse({
                    routes: {'/featured/': {template: 'featured', data}}
                });

                assert.deepEqual(result.routes[0].data, data);
            });
        });

        describe('keeps {slug} notation', function () {
            it('does not convert {slug} to :slug in collection permalink', function () {
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/'}}
                });

                assert.equal(result.collections[0].permalink, '/{slug}/');
            });

            it('does not convert {slug} to :slug in taxonomy', function () {
                const result = parse({
                    taxonomies: {tag: '/tag/{slug}/'}
                });

                assert.equal(result.taxonomies.tag, '/tag/{slug}/');
            });
        });

        describe('legacy YAML coercions', function () {
            it('coerces digit-only string limits to numbers in collections', function () {
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/', template: 'index', limit: '100'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: ['index'], limit: 100}
                ]);
            });

            it('coerces digit-only string limits to numbers in channel routes', function () {
                const result = parse({
                    routes: {'/podcast/': {controller: 'channel', limit: '5'}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/podcast/', templates: [], limit: 5}
                ]);
            });

            it('coerces digit-only string limits to numbers in browse data entries', function () {
                const result = parse({
                    routes: {'/podcast/': {template: 'podcast', data: {episodes: {type: 'browse', resource: 'posts', limit: '15'}}}}
                });

                assert.deepEqual(result.routes, [{
                    type: 'template',
                    path: '/podcast/',
                    templates: ['podcast'],
                    data: {episodes: {type: 'browse', resource: 'posts', limit: 15}}
                }]);
            });

            it('still rejects non-numeric string limits', function () {
                assert.throws(() => {
                    parse({collections: {'/': {permalink: '/{slug}/', limit: 'banana'}}});
                }, /Invalid input/);
            });

            it('still accepts the literal "all" limit', function () {
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/', limit: 'all'}}
                });

                assert.equal(result.collections[0].limit, 'all');
            });

            it('treats empty optional scalars as unset in collections', function () {
                const result = parse({
                    collections: {'/': {permalink: '/{slug}/', template: 'index', filter: null, order: null, limit: null, rss: null}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/', permalink: '/{slug}/', templates: ['index']}
                ]);
            });

            it('treats empty optional scalars as unset in routes', function () {
                const result = parse({
                    routes: {'/podcast/': {controller: 'channel', filter: null, order: null, limit: null, rss: null}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'channel', path: '/podcast/', templates: []}
                ]);
            });

            it('treats empty optional scalars as unset in browse data entries', function () {
                const result = parse({
                    routes: {'/podcast/': {template: 'podcast', data: {episodes: {type: 'browse', resource: 'posts', filter: null, order: null, limit: null, include: null}}}}
                });

                assert.deepEqual(result.routes, [{
                    type: 'template',
                    path: '/podcast/',
                    templates: ['podcast'],
                    data: {episodes: {type: 'browse', resource: 'posts'}}
                }]);
            });

            it('treats an empty template as unset in collections', function () {
                const result = parse({
                    collections: {'/anime/': {permalink: '/anime/{slug}/', template: null, filter: 'primary_tag:anime'}}
                });

                assert.deepEqual(result.collections, [
                    {path: '/anime/', permalink: '/anime/{slug}/', templates: [], filter: 'primary_tag:anime'}
                ]);
            });

            it('treats an empty content_type as unset', function () {
                const result = parse({
                    routes: {'/rss/': {template: 'rss', content_type: null}}
                });

                assert.deepEqual(result.routes, [
                    {type: 'template', path: '/rss/', templates: ['rss']}
                ]);
            });
        });

        describe('default-routes.yaml', function () {
            it('correctly parses the default routes.yaml content', function () {
                const result = parse({
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
                    },
                    yamlSource: ''
                });
            });
        });
    });

    describe('serializeRouteSettings', function () {
        it('serializes empty settings', function () {
            const settings = buildRouteSettings({routes: [], collections: [], taxonomies: {}});
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('routes: null'));
            assert.ok(yaml.includes('collections: null'));
            assert.ok(yaml.includes('taxonomies: null'));
        });

        it('serializes simple template route as bare string', function () {
            const settings = buildRouteSettings({
                routes: [{type: 'template', path: '/about/', templates: ['about']}],
                collections: [],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('/about/: about'));
        });

        it('serializes channel route as object with controller: channel', function () {
            const settings = buildRouteSettings({
                routes: [{
                    type: 'channel',
                    path: '/featured/',
                    templates: ['featured'],
                    filter: 'featured:true',
                    rss: true
                }],
                collections: [],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('/featured/:'));
            assert.ok(yaml.includes('template: featured'));
            assert.ok(yaml.includes('controller: channel'));
            assert.ok(yaml.includes('filter: featured:true'));
        });

        it('does not emit rss when unset (default)', function () {
            const settings = buildRouteSettings({
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f'}],
                collections: [],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(!yaml.includes('rss:'));
        });

        it('emits rss when explicitly true', function () {
            const settings = buildRouteSettings({
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f', rss: true}],
                collections: [],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('rss: true'));
        });

        it('emits rss when false', function () {
            const settings = buildRouteSettings({
                routes: [{type: 'channel', path: '/ch/', templates: [], filter: 'f', rss: false}],
                collections: [],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('rss: false'));
        });

        it('serializes collection', function () {
            const settings = buildRouteSettings({
                routes: [],
                collections: [{path: '/', permalink: '/{slug}/', templates: ['index']}],
                taxonomies: {}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('permalink: /{slug}/'));
            assert.ok(yaml.includes('template: index'));
        });

        it('serializes taxonomies', function () {
            const settings = buildRouteSettings({
                routes: [],
                collections: [],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            });
            const yaml = serializeRouteSettings(settings);

            assert.ok(yaml.includes('tag: /tag/{slug}/'));
            assert.ok(yaml.includes('author: /author/{slug}/'));
        });

        it('roundtrips through parse → serialize → parse', function () {
            const original = buildRouteSettings({
                routes: [
                    {type: 'template', path: '/about/', templates: ['about']},
                    {type: 'channel', path: '/featured/', templates: ['featured'], filter: 'featured:true', rss: true, data: 'tag.featured'}
                ],
                collections: [
                    {path: '/', permalink: '/{slug}/', templates: ['index']},
                    {path: '/podcast/', permalink: '/podcast/{slug}/', templates: ['podcast'], filter: 'tag:podcast'}
                ],
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            });

            const yamlStr = serializeRouteSettings(original);
            const reparsed = parseRouteSettings(require('js-yaml').load(yamlStr), yamlStr);

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

            const parsed = parse(require('js-yaml').load(originalYaml));
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

            const parsed = parse(raw);
            const yamlStr = serializeRouteSettings(parsed);
            const reparsed = parse(require('js-yaml').load(yamlStr));

            assert.deepEqual(reparsed, parsed);
        });
    });
});
