import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

function throwsValidation(fn: () => void, expectedMessage?: string) {
    assert.throws(fn, (err: any) => {
        if (!(err instanceof errors.ValidationError)) {
            return false;
        }
        if (expectedMessage && !err.message.includes(expectedMessage)) {
            return false;
        }
        return true;
    });
}

describe('UNIT: services/route-settings/validation (via parseRouteSettings)', function () {
    it('accepts valid empty input', function () {
        assert.doesNotThrow(() => parseRouteSettings({}));
    });

    it('accepts valid null input', function () {
        assert.doesNotThrow(() => parseRouteSettings(null));
    });

    it('accepts valid default settings', function () {
        assert.doesNotThrow(() => parseRouteSettings({
            collections: {'/': {permalink: '/{slug}/', template: 'index'}},
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        }));
    });

    describe('route validation', function () {
        it('throws on route path without leading slash', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'about/': 'about'}
            }));
        });

        it('throws on route path without trailing slash', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/about': 'about'}
            }));
        });

        it('throws on null route value', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/about/': null}
            }), 'Please define a template.');
        });

        it('throws on template route with no template and no data', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/empty/': {}}
            }), 'Please define a template.');
        });

        it('accepts template route with data but no template', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/food/': {data: 'tag.food'}}
            }));
        });

        it('accepts template route with content_type but no template', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/rss/': {content_type: 'text/xml'}}
            }));
        });

        it('accepts channel route with no template', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/featured/': {controller: 'channel', filter: 'featured:true'}}
            }));
        });

        it('throws on channel route with wrong-typed rss', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: 'notabool'}}
            }));
        });

        it('throws on route path with :slug notation', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/foo/:slug/': 'post'}
            }));
        });
    });

    describe('collection validation', function () {
        it('throws on collection path without leading slash', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'blog/': {permalink: '/{slug}/'}}
            }));
        });

        it('throws on collection path without trailing slash', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/blog': {permalink: '/{slug}/'}}
            }));
        });

        it('throws when permalink is missing', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/': {permalink: ''}}
            }), 'Please define a permalink route.');
        });

        it('throws when permalink key is absent', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/': {}}
            }), 'Please define a permalink route.');
        });

        it('throws on collection path with :slug notation', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/blog/:slug/': {permalink: '/{slug}/'}}
            }));
        });

        it('throws on permalink without leading slash', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/': {permalink: '{slug}/'}}
            }));
        });

        it('throws on permalink without trailing slash', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/': {permalink: '/{slug}'}}
            }));
        });

        it('throws on permalink using :slug notation', function () {
            throwsValidation(() => parseRouteSettings({
                collections: {'/': {permalink: '/:slug/'}}
            }));
        });

        it('accepts valid permalink with {slug}', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                collections: {'/': {permalink: '/{slug}/'}}
            }));
        });

        it('accepts permalink with multiple params', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                collections: {'/': {permalink: '/{primary_tag}/{slug}/'}}
            }));
        });
    });

    describe('taxonomy validation', function () {
        it('throws on unknown taxonomy key', function () {
            throwsValidation(() => parseRouteSettings({
                taxonomies: {category: '/category/{slug}/'}
            }), 'Unknown taxonomy.');
        });

        it('throws on taxonomy without leading slash', function () {
            throwsValidation(() => parseRouteSettings({
                taxonomies: {tag: 'tag/{slug}/'}
            }));
        });

        it('throws on taxonomy without trailing slash', function () {
            throwsValidation(() => parseRouteSettings({
                taxonomies: {tag: '/tag/{slug}'}
            }));
        });

        it('throws on taxonomy using :slug notation', function () {
            throwsValidation(() => parseRouteSettings({
                taxonomies: {tag: '/tag/:slug/'}
            }));
        });

        it('throws on empty taxonomy value', function () {
            throwsValidation(() => parseRouteSettings({
                taxonomies: {tag: ''}
            }));
        });

        it('accepts valid taxonomies', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            }));
        });
    });

    describe('data validation', function () {
        it('accepts valid shortform data', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/food/': {template: 'food', data: 'tag.food'}}
            }));
        });

        it('throws on invalid shortform data format', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {template: 'food', data: 'tag:food'}}
            }));
        });

        it('throws on shortform data with trailing junk', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {template: 'food', data: 'tag.food:'}}
            }));
        });

        it('throws on shortform data with extra dot segments', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {template: 'food', data: 'tag.food.extra'}}
            }));
        });

        it('throws on invalid shortform resource name', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {template: 'food', data: 'category.food'}}
            }));
        });

        it('accepts valid longform data', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'browse', filter: 'featured:true'}}
                }}
            }));
        });

        it('throws on longform data missing resource', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {type: 'browse'}}
                }}
            }), 'resource is required.');
        });

        it('throws on read data entry without slug', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'read'}}
                }}
            }), 'slug is required for read data entries.');
        });

        it('accepts read data entry with slug', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'read', slug: 'my-post'}}
                }}
            }));
        });

        it('throws on longform data missing type', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts'}}
                }}
            }), 'type is required.');
        });

        it('throws on longform data with invalid type', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'edit'}}
                }}
            }), 'edit not supported.');
        });

        it('throws on longform data with invalid resource', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'subscribers', type: 'browse'}}
                }}
            }), 'subscribers not supported.');
        });

        it('throws on reserved key name in data', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {resource: {resource: 'posts', type: 'browse'}}
                }}
            }), 'Please wrap the data definition into a custom name.');
        });

        it('throws on unwrapped data with string values (reserved keys)', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {resource: 'posts', type: 'browse', filter: 'featured:true'}
                }}
            }), 'Please wrap the data definition into a custom name.');
        });

        it('throws on author key name in data', function () {
            throwsValidation(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {author: {resource: 'authors', type: 'read', slug: 'ghost'}}
                }}
            }));
        });

        it('accepts mixed shortform and longform data entries', function () {
            assert.doesNotThrow(() => parseRouteSettings({
                routes: {'/food/': {
                    template: 'food',
                    data: {
                        featured: {resource: 'posts', type: 'browse'},
                        main_tag: 'tag.getting-started'
                    }
                }}
            }));
        });
    });
});
