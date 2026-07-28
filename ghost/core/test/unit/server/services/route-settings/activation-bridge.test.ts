import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'vitest';
import {expandRouteSettings} from '../../../../../core/server/services/route-settings/activation-bridge';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {buildRouteSettings} from './route-settings-fixture';

const parseYaml = require('../../../../../core/server/services/route-settings/yaml-parser');

// The bridge only reads structural fields — raw objects built inline have no
// YAML text behind them, so an empty source is attached.
const parse = (raw: unknown) => parseRouteSettings(raw, '');

function empty() {
    return buildRouteSettings({routes: [], collections: [], taxonomies: {}});
}

describe('activation-bridge', function () {
    describe('expandRouteSettings', function () {
        it('returns empty maps for empty settings', function () {
            const result = expandRouteSettings(empty());

            assert.deepEqual(result, {
                routes: {},
                collections: {},
                taxonomies: {}
            });
        });

        // Characterisation tests for the full expanded output. The expected
        // values are the canonical expansions the legacy validate.js produced
        // before it was retired — parsing + the bridge must keep matching them
        // so routes_hash and router wiring stay byte-for-byte stable.
        describe('produces the expected expanded output', function () {
            const cases: Array<{name: string; raw: unknown; expected: object}> = [
                {
                    name: 'bare string template route',
                    raw: {routes: {'/about/': 'about'}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/about/': {templates: ['about']}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'template route with content_type',
                    raw: {routes: {'/api/': {template: 'api', content_type: 'application/json'}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/api/': {content_type: 'application/json', templates: ['api']}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'channel route',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured'}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', templates: ['featured']}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'channel route with rss disabled',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: false}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: false, templates: []}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'route with shortform data',
                    raw: {routes: {'/food/': {template: 'food', data: 'tag.food'}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'food', visibility: 'public'}}},
                                router: {tags: [{slug: 'food', redirect: true}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'route with named shortform data',
                    raw: {routes: {'/food/': {template: 'food', data: {recipe: 'tag.recipes', post: 'post.my-post'}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {
                                    recipe: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'recipes', visibility: 'public'}},
                                    post: {controller: 'postsPublic', type: 'read', resource: 'posts', options: {slug: 'my-post'}}
                                },
                                router: {
                                    tags: [{slug: 'recipes', redirect: true}],
                                    posts: [{slug: 'my-post', redirect: true}]
                                }
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'route with longform read data',
                    raw: {routes: {'/food/': {template: 'food', data: {people: {resource: 'authors', type: 'read', slug: 'joe'}}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {people: {options: {slug: 'joe'}, type: 'read', resource: 'authors', controller: 'authorsPublic'}},
                                router: {authors: [{slug: 'joe', redirect: true}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'route with longform browse data',
                    raw: {routes: {'/food/': {template: 'food', data: {featured: {resource: 'posts', type: 'browse', filter: 'featured:true', limit: 3}}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {featured: {options: {limit: 3, filter: 'featured:true'}, type: 'browse', resource: 'posts', controller: 'postsPublic'}},
                                router: {posts: [{redirect: true}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'collection with permalink',
                    raw: {routes: {}, collections: {'/': {permalink: '/{slug}/', template: 'index'}}, taxonomies: {}},
                    expected: {routes: {}, collections: {'/': {permalink: '/:slug/', templates: ['index']}}, taxonomies: {}}
                },
                {
                    name: 'collection with filter and data',
                    raw: {routes: {}, collections: {'/podcast/': {permalink: '/podcast/{slug}/', filter: 'tag:podcast', template: 'podcast', data: 'tag.podcast'}}, taxonomies: {}},
                    expected: {
                        routes: {},
                        collections: {'/podcast/': {
                            permalink: '/podcast/:slug/',
                            filter: 'tag:podcast',
                            data: {
                                query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'podcast', visibility: 'public'}}},
                                router: {tags: [{slug: 'podcast', redirect: true}]}
                            },
                            templates: ['podcast']
                        }},
                        taxonomies: {}
                    }
                },
                {
                    name: 'taxonomies',
                    raw: {routes: {}, collections: {}, taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}},
                    expected: {routes: {}, collections: {}, taxonomies: {tag: '/tag/:slug/', author: '/author/:slug/'}}
                },
                {
                    name: 'a full routes.yaml',
                    raw: {
                        routes: {
                            '/about/': 'about',
                            '/food/': {template: 'food', data: 'tag.food'},
                            '/featured/': {controller: 'channel', filter: 'featured:true', template: 'featured'}
                        },
                        collections: {
                            '/podcast/': {permalink: '/podcast/{slug}/', filter: 'tag:podcast', template: 'podcast', data: 'tag.podcast'},
                            '/': {permalink: '/{slug}/', template: 'index'}
                        },
                        taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
                    },
                    expected: {
                        routes: {
                            '/about/': {templates: ['about']},
                            '/food/': {
                                data: {
                                    query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'food', visibility: 'public'}}},
                                    router: {tags: [{slug: 'food', redirect: true}]}
                                },
                                templates: ['food']
                            },
                            '/featured/': {controller: 'channel', filter: 'featured:true', templates: ['featured']}
                        },
                        collections: {
                            '/podcast/': {
                                permalink: '/podcast/:slug/',
                                filter: 'tag:podcast',
                                data: {
                                    query: {tag: {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'podcast', visibility: 'public'}}},
                                    router: {tags: [{slug: 'podcast', redirect: true}]}
                                },
                                templates: ['podcast']
                            },
                            '/': {permalink: '/:slug/', templates: ['index']}
                        },
                        taxonomies: {tag: '/tag/:slug/', author: '/author/:slug/'}
                    }
                },
                {
                    name: 'channel route with explicit rss: true',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: true}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: true, templates: []}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'channel route with rss omitted',
                    raw: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true'}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/featured/': {controller: 'channel', filter: 'featured:true', templates: []}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'template route with array templates',
                    raw: {routes: {'/about/': {template: ['about', 'default']}}, collections: {}, taxonomies: {}},
                    expected: {routes: {'/about/': {templates: ['about', 'default']}}, collections: {}, taxonomies: {}}
                },
                {
                    name: 'longform read data with redirect: false',
                    raw: {routes: {'/food/': {template: 'food', data: {people: {resource: 'authors', type: 'read', slug: 'joe', redirect: false}}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {people: {options: {slug: 'joe'}, type: 'read', resource: 'authors', controller: 'authorsPublic'}},
                                router: {authors: [{redirect: false, slug: 'joe'}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'longform browse data with limit: all',
                    raw: {routes: {'/food/': {template: 'food', data: {featured: {resource: 'posts', type: 'browse', limit: 'all'}}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {featured: {options: {limit: 'all'}, type: 'browse', resource: 'posts', controller: 'postsPublic'}},
                                router: {posts: [{redirect: true}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'two data entries resolve to the same router key',
                    raw: {routes: {'/food/': {template: 'food', data: {one: 'post.first', two: 'post.second'}}}, collections: {}, taxonomies: {}},
                    expected: {
                        routes: {'/food/': {
                            data: {
                                query: {
                                    one: {controller: 'postsPublic', type: 'read', resource: 'posts', options: {slug: 'first'}},
                                    two: {controller: 'postsPublic', type: 'read', resource: 'posts', options: {slug: 'second'}}
                                },
                                router: {posts: [{slug: 'first', redirect: true}, {slug: 'second', redirect: true}]}
                            },
                            templates: ['food']
                        }},
                        collections: {},
                        taxonomies: {}
                    }
                },
                {
                    name: 'collection with rss: false',
                    raw: {routes: {}, collections: {'/': {permalink: '/{slug}/', template: 'index', rss: false}}, taxonomies: {}},
                    expected: {routes: {}, collections: {'/': {permalink: '/:slug/', rss: false, templates: ['index']}}, taxonomies: {}}
                }
            ];

            cases.forEach(({name, raw, expected}) => {
                it(name, function () {
                    assert.deepEqual(expandRouteSettings(parse(raw)), expected);
                });
            });
        });

        describe('slug conversion', function () {
            it('converts {slug} to :slug in collection permalinks', function () {
                const settings = buildRouteSettings({
                    routes: [],
                    collections: [{path: '/', permalink: '/{slug}/', templates: []}],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.collections['/'].permalink, '/:slug/');
            });

            it('converts {primary_author} to :primary_author in permalinks', function () {
                const settings = buildRouteSettings({
                    routes: [],
                    collections: [{path: '/', permalink: '/{primary_author}/{slug}/', templates: []}],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.collections['/'].permalink, '/:primary_author/:slug/');
            });

            it('converts {slug} to :slug in taxonomy paths', function () {
                const settings = buildRouteSettings({
                    routes: [],
                    collections: [],
                    taxonomies: {tag: '/tag/{slug}/'}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.taxonomies.tag, '/tag/:slug/');
            });
        });

        describe('route expansion', function () {
            it('sets controller to channel for channel routes', function () {
                const settings = buildRouteSettings({
                    routes: [{type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: true}],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/featured/'].controller, 'channel');
            });

            it('maps contentType back to content_type', function () {
                const settings = buildRouteSettings({
                    routes: [{type: 'template', path: '/api/', templates: ['api'], contentType: 'application/json'}],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/api/'].content_type, 'application/json');
                assert.equal(result.routes['/api/'].contentType, undefined);
            });

            it('omits data when no data specified', function () {
                const settings = buildRouteSettings({
                    routes: [{type: 'template', path: '/about/', templates: ['about']}],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/about/'].data, undefined);
            });
        });

        describe('data expansion', function () {
            it('expands shortform data with redirect enabled by default', function () {
                const settings = buildRouteSettings({
                    routes: [{type: 'template', path: '/food/', templates: ['food'], data: 'tag.food'}],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.router.tags[0].redirect, true);
                assert.equal(data.router.tags[0].slug, 'food');
                assert.equal(data.query.tag.options.slug, 'food');
            });

            it('expands longform read data with default options', function () {
                const settings = buildRouteSettings({
                    routes: [{
                        type: 'template', path: '/food/', templates: ['food'],
                        data: {
                            people: {resource: 'authors', type: 'read', slug: 'joe'}
                        }
                    }],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.query.people.type, 'read');
                assert.equal(data.query.people.resource, 'authors');
                assert.equal(data.query.people.options.slug, 'joe');
                assert.equal(data.router.authors[0].redirect, true);
            });

            it('expands longform browse data without default slug option', function () {
                const settings = buildRouteSettings({
                    routes: [{
                        type: 'template', path: '/food/', templates: ['food'],
                        data: {
                            featured: {resource: 'posts', type: 'browse', filter: 'featured:true', limit: 3}
                        }
                    }],
                    collections: [],
                    taxonomies: {}
                });

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.query.featured.type, 'browse');
                assert.equal(data.query.featured.options.filter, 'featured:true');
                assert.equal(data.query.featured.options.limit, 3);
                assert.equal(data.query.featured.options.slug, undefined);
            });
        });
    });

    describe('hash continuity', function () {
        // routes_hash is md5(JSON.stringify(...)) over the expanded settings —
        // parsing + the bridge must keep producing the known default hash so a
        // site that never customised its routes keeps the same stored value.
        const DEFAULT_ROUTES_HASH = '3d180d52c663d173a6be791ef411ed01';

        const defaultRoutesYaml = fs.readFileSync(
            path.join(__dirname, '../../../../../core/server/services/route-settings/default-routes.yaml'),
            'utf8'
        );

        function hash(expanded: object): string {
            return crypto.createHash('md5')
                .update(JSON.stringify(expanded), 'binary')
                .digest('hex');
        }

        it('bridge output serializes to the known default routes hash', function () {
            const domain = parseRouteSettings(parseYaml(defaultRoutesYaml), defaultRoutesYaml);
            const expanded = expandRouteSettings(domain);

            assert.equal(hash(expanded), DEFAULT_ROUTES_HASH);
        });

        describe('stringify determinism', function () {
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
                const first = expandRouteSettings(parse(structuredClone(complexConfig)));
                const second = expandRouteSettings(parse(structuredClone(complexConfig)));

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

                const first = expandRouteSettings(parse(orderedOneWay));
                const second = expandRouteSettings(parse(orderedAnotherWay));

                assert.equal(JSON.stringify(first), JSON.stringify(second));
            });
        });
    });
});
