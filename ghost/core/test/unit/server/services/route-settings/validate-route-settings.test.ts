import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';

// Validation is exercised on structures built inline — there is no YAML text
// behind them, so an empty source is attached.
const parse = (raw: unknown) => parseRouteSettings(raw, '');

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
        assert.doesNotThrow(() => parse({}));
    });

    it('accepts valid null input', function () {
        assert.doesNotThrow(() => parse(null));
    });

    it('accepts valid default settings', function () {
        assert.doesNotThrow(() => parse({
            collections: {'/': {permalink: '/{slug}/', template: 'index'}},
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        }));
    });

    describe('route validation', function () {
        it('throws on route path without leading slash', function () {
            throwsValidation(() => parse({
                routes: {'about/': 'about'}
            }));
        });

        it('throws on route path without trailing slash', function () {
            throwsValidation(() => parse({
                routes: {'/about': 'about'}
            }));
        });

        it('throws on null route value', function () {
            throwsValidation(() => parse({
                routes: {'/about/': null}
            }), 'Please define a template');
        });

        it('throws on template route with no template and no data', function () {
            throwsValidation(() => parse({
                routes: {'/empty/': {}}
            }), 'Please define a template');
        });

        it('accepts template route with data but no template', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/food/': {data: 'tag.food'}}
            }));
        });

        it('accepts template route with content_type but no template', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/rss/': {content_type: 'text/xml'}}
            }));
        });

        it('accepts channel route with no template', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/featured/': {controller: 'channel', filter: 'featured:true'}}
            }));
        });

        it('throws on channel route with wrong-typed rss', function () {
            throwsValidation(() => parse({
                routes: {'/featured/': {controller: 'channel', filter: 'featured:true', rss: 'notabool'}}
            }));
        });

        it('accepts route path with :slug notation', function () {
            const settings = parse({
                routes: {'/foo/:slug/': 'post'}
            });

            assert.equal(settings.routes[0].path, '/foo/:slug/');
        });
    });

    describe('collection validation', function () {
        it('throws on collection path without leading slash', function () {
            throwsValidation(() => parse({
                collections: {'blog/': {permalink: '/{slug}/'}}
            }));
        });

        it('throws on collection path without trailing slash', function () {
            throwsValidation(() => parse({
                collections: {'/blog': {permalink: '/{slug}/'}}
            }));
        });

        it('throws when permalink is missing', function () {
            throwsValidation(() => parse({
                collections: {'/': {permalink: ''}}
            }), 'Please define a permalink route');
        });

        it('throws when permalink key is absent', function () {
            throwsValidation(() => parse({
                collections: {'/': {}}
            }), 'Please define a permalink route');
        });

        it('accepts collection path with :slug notation', function () {
            const settings = parse({
                collections: {'/blog/:slug/': {permalink: '/{slug}/'}}
            });

            assert.equal(settings.collections[0].path, '/blog/:slug/');
        });

        it('throws on permalink using :slug notation even when the path does', function () {
            throwsValidation(() => parse({
                collections: {'/blog/:slug/': {permalink: '/:slug/'}}
            }), 'uses the :param notation');
        });

        it('throws on permalink without leading slash', function () {
            throwsValidation(() => parse({
                collections: {'/': {permalink: '{slug}/'}}
            }));
        });

        it('throws on permalink without trailing slash', function () {
            throwsValidation(() => parse({
                collections: {'/': {permalink: '/{slug}'}}
            }));
        });

        it('throws on permalink using :slug notation', function () {
            throwsValidation(() => parse({
                collections: {'/': {permalink: '/:slug/'}}
            }));
        });

        it('accepts valid permalink with {slug}', function () {
            assert.doesNotThrow(() => parse({
                collections: {'/': {permalink: '/{slug}/'}}
            }));
        });

        it('accepts permalink with multiple params', function () {
            assert.doesNotThrow(() => parse({
                collections: {'/': {permalink: '/{primary_tag}/{slug}/'}}
            }));
        });
    });

    describe('taxonomy validation', function () {
        it('throws on unknown taxonomy key', function () {
            throwsValidation(() => parse({
                taxonomies: {category: '/category/{slug}/'}
            }), 'Unknown taxonomy.');
        });

        it('throws on taxonomy without leading slash', function () {
            throwsValidation(() => parse({
                taxonomies: {tag: 'tag/{slug}/'}
            }));
        });

        it('throws on taxonomy without trailing slash', function () {
            throwsValidation(() => parse({
                taxonomies: {tag: '/tag/{slug}'}
            }));
        });

        it('throws on taxonomy using :slug notation', function () {
            throwsValidation(() => parse({
                taxonomies: {tag: '/tag/:slug/'}
            }));
        });

        it('throws on empty taxonomy value', function () {
            throwsValidation(() => parse({
                taxonomies: {tag: ''}
            }));
        });

        it('accepts valid taxonomies', function () {
            assert.doesNotThrow(() => parse({
                taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            }));
        });
    });

    describe('data validation', function () {
        it('accepts valid shortform data', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/food/': {template: 'food', data: 'tag.food'}}
            }));
        });

        it('accepts %s as the shortform slug', function () {
            const settings = parse({
                routes: {'/food/': {template: 'food', data: 'tag.%s'}}
            });

            assert.equal(settings.routes[0].data, 'tag.%s');
        });

        it('throws on shortform data with %s embedded in the slug', function () {
            // %s is only meaningful as the whole slug — fetch-data swaps it for the
            // request's slug param, and nothing in the fleet uses a partial form.
            throwsValidation(() => parse({
                routes: {'/food/': {template: 'food', data: 'tag.recipes-%s'}}
            }));
        });

        it('throws on invalid shortform data format', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {template: 'food', data: 'tag:food'}}
            }));
        });

        it('throws on shortform data with trailing junk', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {template: 'food', data: 'tag.food:'}}
            }));
        });

        it('throws on shortform data with extra dot segments', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {template: 'food', data: 'tag.food.extra'}}
            }));
        });

        it('throws on invalid shortform resource name', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {template: 'food', data: 'category.food'}}
            }));
        });

        it('accepts valid longform data', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'browse', filter: 'featured:true'}}
                }}
            }));
        });

        it('throws on longform data missing resource', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {type: 'browse'}}
                }}
            }), 'resource is required.');
        });

        it('throws on read data entry without slug', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'read'}}
                }}
            }), 'slug is required for read data entries.');
        });

        it('accepts read data entry with slug', function () {
            assert.doesNotThrow(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'read', slug: 'my-post'}}
                }}
            }));
        });

        it('throws on longform data missing type', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts'}}
                }}
            }), 'type is required.');
        });

        it('throws on longform data with invalid type', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'posts', type: 'edit'}}
                }}
            }), 'type "edit" is not supported.');
        });

        it('throws on longform data with invalid resource', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {featured: {resource: 'subscribers', type: 'browse'}}
                }}
            }), 'resource "subscribers" is not supported.');
        });

        it('throws on reserved key name in data', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {resource: {resource: 'posts', type: 'browse'}}
                }}
            }), 'Please wrap the data definition into a custom name.');
        });

        it('throws on unwrapped data with string values (reserved keys)', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {resource: 'posts', type: 'browse', filter: 'featured:true'}
                }}
            }), 'Please wrap the data definition into a custom name.');
        });

        it('throws on author key name in data', function () {
            throwsValidation(() => parse({
                routes: {'/food/': {
                    template: 'food',
                    data: {author: {resource: 'authors', type: 'read', slug: 'ghost'}}
                }}
            }));
        });

        it('accepts mixed shortform and longform data entries', function () {
            assert.doesNotThrow(() => parse({
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

    describe('error messages', function () {
        function messageFor(raw: unknown): string {
            try {
                parse(raw);
            } catch (err) {
                assert.ok(err instanceof errors.ValidationError, `expected a ValidationError, got ${err}`);
                return err.message;
            }
            return assert.fail('expected parsing to throw');
        }

        function helpFor(raw: unknown): string | undefined {
            try {
                parse(raw);
            } catch (err) {
                return (err as {help?: string}).help;
            }
            return assert.fail('expected parsing to throw');
        }

        it('names the file when the whole document is not a map', function () {
            assert.equal(
                messageFor(['a', 'b']),
                'The following definition "routes.yaml" is invalid: the file must be a map of routes, collections or taxonomies, but a list was provided.'
            );
        });

        it('names the section when it is not a map', function () {
            assert.equal(
                messageFor({routes: 'hello'}),
                'The following definition "routes" is invalid: routes must be a map of route paths (e.g. /about/: about), but the text "hello" was provided.'
            );
            assert.equal(
                messageFor({collections: 'hello'}),
                'The following definition "collections" is invalid: collections must be a map of collection paths (e.g. /blog/: {permalink: /{slug}/}), but the text "hello" was provided.'
            );
            assert.equal(
                messageFor({taxonomies: 'hello'}),
                'The following definition "taxonomies" is invalid: taxonomies must be a map of tag and/or author permalinks (e.g. tag: /tag/{slug}/), but the text "hello" was provided.'
            );
        });

        it('names the route or collection when its value is the wrong shape', function () {
            assert.equal(
                messageFor({routes: {'/x/': ['a', 'b']}}),
                'The following definition "routes[\'/x/\']" is invalid: a route must be a template name, or a map of route options (e.g. template, controller, data), but a list was provided.'
            );
            assert.equal(
                messageFor({collections: {'/blog/': 'index'}}),
                'The following definition "collections[\'/blog/\']" is invalid: a collection must be a map of collection options (e.g. permalink, template, filter), but the text "index" was provided.'
            );
        });

        it('names the route and the key that failed', function () {
            assert.equal(
                messageFor({routes: {'/x/': {controller: 'channel', filter: 42}}}),
                'The following definition "routes[\'/x/\'].filter" is invalid: filter must be a filter string (e.g. filter: featured:true), but 42 was provided.'
            );
        });

        it('explains what limit accepts', function () {
            assert.equal(
                messageFor({routes: {'/x/': {controller: 'channel', limit: [1, 2]}}}),
                'The following definition "routes[\'/x/\'].limit" is invalid: limit must be a number or "all" (e.g. limit: 5), but a list was provided.'
            );
        });

        it('blames the entries when a key that accepts a list gets a bad list', function () {
            assert.equal(
                messageFor({routes: {'/x/': {template: ['index', 5]}}}),
                'The following definition "routes[\'/x/\'].template" is invalid: template must be a template name, or a list of template names (e.g. template: index), but one or more of the entries is not a template name.'
            );
        });

        it('names the key inside a data entry', function () {
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: {episodes: {type: 'browse', resource: 'posts', limit: [1, 2]}}}}}),
                'The following definition "routes[\'/x/\'].data.episodes.limit" is invalid: limit must be a number or "all" (e.g. limit: 5), but a list was provided.'
            );
        });

        it('names data and data entries that are the wrong shape', function () {
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: 42}}}),
                'The following definition "routes[\'/x/\'].data" is invalid: data must be a shorthand like tag.recipes, or a map of named data entries, but 42 was provided.'
            );
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: {episodes: 42}}}}),
                'The following definition "routes[\'/x/\'].data.episodes" is invalid: a data entry must be a shorthand like tag.recipes, or a map with type and resource, but 42 was provided.'
            );
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: {episodes: ['tag.recipes']}}}}),
                'The following definition "routes[\'/x/\'].data.episodes" is invalid: a data entry must be a shorthand like tag.recipes, or a map with type and resource, but a list was provided.'
            );
            // A list of shorthands would otherwise be read as a map keyed "0", "1", …
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: ['tag.recipes', 'post.hello']}}}),
                'The following definition "routes[\'/x/\'].data" is invalid: data must be a shorthand like tag.recipes, or a map of named data entries, but a list was provided.'
            );
        });

        it('names the reserved data key that needs wrapping', function () {
            assert.equal(
                messageFor({routes: {'/x/': {template: 'x', data: {resource: 'posts', type: 'browse'}}}}),
                'The following definition "routes[\'/x/\'].data.resource" is invalid: "resource" is a reserved key. Please wrap the data definition into a custom name.'
            );
        });

        it('names the collection key that failed', function () {
            assert.equal(
                messageFor({collections: {'/blog/': {permalink: 123}}}),
                'The following definition "collections[\'/blog/\'].permalink" is invalid: permalink must be a route with a leading and trailing slash (e.g. permalink: /{slug}/), but 123 was provided.'
            );
        });

        it('names the taxonomy that failed', function () {
            assert.equal(
                messageFor({taxonomies: {tag: 5}}),
                'The following definition "taxonomies.tag" is invalid: the tag taxonomy must be a permalink route (e.g. tag: /tag/{slug}/), but 5 was provided.'
            );
            assert.equal(
                messageFor({taxonomies: {author: true}}),
                'The following definition "taxonomies.author" is invalid: the author taxonomy must be a permalink route (e.g. author: /author/{slug}/), but true was provided.'
            );
        });

        it('carries the example for the key that is missing', function () {
            assert.equal(
                messageFor({routes: {'/x/': {}}}),
                'The following definition "routes[\'/x/\']" is invalid: Please define a template, e.g. /about/: about.'
            );
            assert.equal(
                messageFor({collections: {'/blog/': {}}}),
                'The following definition "collections[\'/blog/\']" is invalid: Please define a permalink route, e.g. permalink: /{slug}/.'
            );
            assert.equal(
                messageFor({taxonomies: {author: ''}}),
                'The following definition "taxonomies.author" is invalid: Please define a taxonomy permalink route, e.g. author: /author/{slug}/.'
            );
        });

        it('describes what the author wrote', function () {
            // rss takes a boolean, so anything else lands in describeValue
            const found = (value: unknown) => messageFor({routes: {'/x/': {controller: 'channel', rss: value}}})
                .replace(/^.*but /, '');

            assert.equal(found(42), '42 was provided.');
            assert.equal(found({a: 1}), 'a map was provided.');
            assert.equal(found(new Date('2020-01-01')), 'a date was provided.');
            assert.equal(found('x'.repeat(40)), `the text "${'x'.repeat(40)}" was provided.`);
            assert.equal(found('x'.repeat(41)), `the text "${'x'.repeat(40)}…" was provided.`);
            assert.match(messageFor({routes: {'/x/': {controller: 'channel', filter: true}}}), /but true was provided\.$/);
        });

        describe('paths', function () {
            const cases: [string, unknown, string][] = [
                ['route missing a leading slash', {routes: {'about/': 'about'}}, 'The following definition "routes[\'about/\']" is invalid: "about/" is missing a leading slash. Please use e.g. /about/.'],
                ['route missing a trailing slash', {routes: {'/about': 'about'}}, 'The following definition "routes[\'/about\']" is invalid: "/about" is missing a trailing slash. Please use e.g. /about/.'],
                ['collection missing a leading slash', {collections: {'blog/': {permalink: '/{slug}/'}}}, 'The following definition "collections[\'blog/\']" is invalid: "blog/" is missing a leading slash. Please use e.g. /blog/.'],
                ['collection missing a trailing slash', {collections: {'/blog': {permalink: '/{slug}/'}}}, 'The following definition "collections[\'/blog\']" is invalid: "/blog" is missing a trailing slash. Please use e.g. /blog/.'],
                ['permalink missing a leading slash', {collections: {'/blog/': {permalink: '{slug}/'}}}, 'The following definition "collections[\'/blog/\'].permalink" is invalid: "{slug}/" is missing a leading slash. Please use e.g. /{slug}/.'],
                ['permalink missing a trailing slash', {collections: {'/blog/': {permalink: '/{slug}'}}}, 'The following definition "collections[\'/blog/\'].permalink" is invalid: "/{slug}" is missing a trailing slash. Please use e.g. /{slug}/.'],
                ['permalink using :param', {collections: {'/blog/': {permalink: '/:slug/'}}}, 'The following definition "collections[\'/blog/\'].permalink" is invalid: "/:slug/" uses the :param notation. Please use "/{slug}/".'],
                ['taxonomy missing a leading slash', {taxonomies: {tag: 'tag/{slug}/'}}, 'The following definition "taxonomies.tag" is invalid: "tag/{slug}/" is missing a leading slash. Please use e.g. /tag/{slug}/.'],
                ['taxonomy using :param', {taxonomies: {author: '/author/:slug/'}}, 'The following definition "taxonomies.author" is invalid: "/author/:slug/" uses the :param notation. Please use "/author/{slug}/".']
            ];

            cases.forEach(([name, raw, expected]) => {
                it(name, function () {
                    assert.equal(messageFor(raw), expected);
                });
            });
        });

        it('points at the docs for schema failures and at an example for data failures', function () {
            assert.equal(helpFor({routes: {'/x/': {controller: 'channel', filter: 42}}}), 'https://ghost.org/docs/themes/routing/');
            assert.equal(helpFor({routes: {'/x/': {template: 'x', data: 'nonsense'}}}), 'e.g. data: tag.recipes');
            assert.match(helpFor({routes: {'/x/': {template: 'x', data: {e: {resource: 'posts'}}}}}) ?? '', /^e\.g\.\n data:/);
        });
    });
});
