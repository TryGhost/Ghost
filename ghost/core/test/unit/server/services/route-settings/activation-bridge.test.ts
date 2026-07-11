import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {expandRouteSettings} from '../../../../../core/server/services/route-settings/activation-bridge';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import type {RouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

const validate = require('../../../../../core/server/services/route-settings/validate');

function empty(): RouteSettings {
    return {routes: [], collections: [], taxonomies: {}};
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

        describe('behavioral equivalence with validate.js', function () {
            it('matches validate.js for bare string template route', function () {
                const raw = {
                    routes: {'/about/': 'about'},
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for template route with content_type', function () {
                const raw = {
                    routes: {
                        '/api/': {
                            template: 'api',
                            content_type: 'application/json'
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for channel route', function () {
                const raw = {
                    routes: {
                        '/featured/': {
                            controller: 'channel',
                            filter: 'featured:true',
                            template: 'featured'
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for channel route with rss disabled', function () {
                const raw = {
                    routes: {
                        '/featured/': {
                            controller: 'channel',
                            filter: 'featured:true',
                            rss: false
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for route with shortform data', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: 'tag.food'
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for route with named shortform data', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                recipe: 'tag.recipes',
                                post: 'post.my-post'
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for route with longform read data', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                people: {
                                    resource: 'authors',
                                    type: 'read',
                                    slug: 'joe'
                                }
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for route with longform browse data', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                featured: {
                                    resource: 'posts',
                                    type: 'browse',
                                    filter: 'featured:true',
                                    limit: 3
                                }
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for collection with permalink', function () {
                const raw = {
                    routes: {},
                    collections: {
                        '/': {
                            permalink: '/{slug}/',
                            template: 'index'
                        }
                    },
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for collection with filter and data', function () {
                const raw = {
                    routes: {},
                    collections: {
                        '/podcast/': {
                            permalink: '/podcast/{slug}/',
                            filter: 'tag:podcast',
                            template: 'podcast',
                            data: 'tag.podcast'
                        }
                    },
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for taxonomies', function () {
                const raw = {
                    routes: {},
                    collections: {},
                    taxonomies: {
                        tag: '/tag/{slug}/',
                        author: '/author/{slug}/'
                    }
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for a full routes.yaml', function () {
                const raw = {
                    routes: {
                        '/about/': 'about',
                        '/food/': {
                            template: 'food',
                            data: 'tag.food'
                        },
                        '/featured/': {
                            controller: 'channel',
                            filter: 'featured:true',
                            template: 'featured'
                        }
                    },
                    collections: {
                        '/podcast/': {
                            permalink: '/podcast/{slug}/',
                            filter: 'tag:podcast',
                            template: 'podcast',
                            data: 'tag.podcast'
                        },
                        '/': {
                            permalink: '/{slug}/',
                            template: 'index'
                        }
                    },
                    taxonomies: {
                        tag: '/tag/{slug}/',
                        author: '/author/{slug}/'
                    }
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for channel route with explicit rss: true', function () {
                const raw = {
                    routes: {
                        '/featured/': {
                            controller: 'channel',
                            filter: 'featured:true',
                            rss: true
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for channel route with rss omitted', function () {
                const raw = {
                    routes: {
                        '/featured/': {
                            controller: 'channel',
                            filter: 'featured:true'
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for template route with array templates', function () {
                const raw = {
                    routes: {'/about/': {template: ['about', 'default']}},
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for longform read data with redirect: false', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                people: {
                                    resource: 'authors',
                                    type: 'read',
                                    slug: 'joe',
                                    redirect: false
                                }
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for longform browse data with limit: all', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                featured: {
                                    resource: 'posts',
                                    type: 'browse',
                                    limit: 'all'
                                }
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js when two data entries resolve to the same router key', function () {
                const raw = {
                    routes: {
                        '/food/': {
                            template: 'food',
                            data: {
                                one: 'post.first',
                                two: 'post.second'
                            }
                        }
                    },
                    collections: {},
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });

            it('matches validate.js for collection with rss: false', function () {
                const raw = {
                    routes: {},
                    collections: {
                        '/': {
                            permalink: '/{slug}/',
                            template: 'index',
                            rss: false
                        }
                    },
                    taxonomies: {}
                };

                const legacy = validate(structuredClone(raw));
                const domain = parseRouteSettings(raw);
                const expanded = expandRouteSettings(domain);

                assert.deepEqual(expanded, legacy);
            });
        });

        describe('slug conversion', function () {
            it('converts {slug} to :slug in collection permalinks', function () {
                const settings: RouteSettings = {
                    routes: [],
                    collections: [{path: '/', permalink: '/{slug}/', templates: []}],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.collections['/'].permalink, '/:slug/');
            });

            it('converts {primary_author} to :primary_author in permalinks', function () {
                const settings: RouteSettings = {
                    routes: [],
                    collections: [{path: '/', permalink: '/{primary_author}/{slug}/', templates: []}],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.collections['/'].permalink, '/:primary_author/:slug/');
            });

            it('converts {slug} to :slug in taxonomy paths', function () {
                const settings: RouteSettings = {
                    routes: [],
                    collections: [],
                    taxonomies: {tag: '/tag/{slug}/'}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.taxonomies.tag, '/tag/:slug/');
            });
        });

        describe('route expansion', function () {
            it('sets controller to channel for channel routes', function () {
                const settings: RouteSettings = {
                    routes: [{type: 'channel', path: '/featured/', templates: [], filter: 'featured:true', rss: true}],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/featured/'].controller, 'channel');
            });

            it('maps contentType back to content_type', function () {
                const settings: RouteSettings = {
                    routes: [{type: 'template', path: '/api/', templates: ['api'], contentType: 'application/json'}],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/api/'].content_type, 'application/json');
                assert.equal(result.routes['/api/'].contentType, undefined);
            });

            it('omits data when no data specified', function () {
                const settings: RouteSettings = {
                    routes: [{type: 'template', path: '/about/', templates: ['about']}],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                assert.equal(result.routes['/about/'].data, undefined);
            });
        });

        describe('data expansion', function () {
            it('expands shortform data with redirect enabled by default', function () {
                const settings: RouteSettings = {
                    routes: [{type: 'template', path: '/food/', templates: ['food'], data: 'tag.food'}],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.router.tags[0].redirect, true);
                assert.equal(data.router.tags[0].slug, 'food');
                assert.equal(data.query.tag.options.slug, 'food');
            });

            it('expands longform read data with default options', function () {
                const settings: RouteSettings = {
                    routes: [{
                        type: 'template', path: '/food/', templates: ['food'],
                        data: {
                            people: {resource: 'authors', type: 'read', slug: 'joe'}
                        }
                    }],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.query.people.type, 'read');
                assert.equal(data.query.people.resource, 'authors');
                assert.equal(data.query.people.options.slug, 'joe');
                assert.equal(data.router.authors[0].redirect, true);
            });

            it('expands longform browse data without default slug option', function () {
                const settings: RouteSettings = {
                    routes: [{
                        type: 'template', path: '/food/', templates: ['food'],
                        data: {
                            featured: {resource: 'posts', type: 'browse', filter: 'featured:true', limit: 3}
                        }
                    }],
                    collections: [],
                    taxonomies: {}
                };

                const result = expandRouteSettings(settings);
                const data = result.routes['/food/'].data;

                assert.equal(data.query.featured.type, 'browse');
                assert.equal(data.query.featured.options.filter, 'featured:true');
                assert.equal(data.query.featured.options.limit, 3);
                assert.equal(data.query.featured.options.slug, undefined);
            });
        });
    });
});
