const assert = require('node:assert/strict');
const {EXPANSIONS, routerTypeOf, buildFilter, filterMatches} = require('../../../../../core/server/services/url/router-filter');

describe('router-filter', function () {
    describe('routerTypeOf', function () {
        it('maps singular DB type values to the plural router type', function () {
            assert.equal(routerTypeOf({type: 'post'}), 'posts');
            assert.equal(routerTypeOf({type: 'page'}), 'pages');
            assert.equal(routerTypeOf({type: 'tag'}), 'tags');
            assert.equal(routerTypeOf({type: 'author'}), 'authors');
        });

        it('passes the plural router types through unchanged', function () {
            assert.equal(routerTypeOf({type: 'posts'}), 'posts');
            assert.equal(routerTypeOf({type: 'pages'}), 'pages');
            assert.equal(routerTypeOf({type: 'tags'}), 'tags');
            assert.equal(routerTypeOf({type: 'authors'}), 'authors');
        });

        it('returns null for missing or unrecognised types', function () {
            assert.equal(routerTypeOf(null), null);
            assert.equal(routerTypeOf(undefined), null);
            assert.equal(routerTypeOf({}), null);
            assert.equal(routerTypeOf({type: 'widget'}), null);
        });
    });

    describe('buildFilter', function () {
        it('returns null for an empty filter', function () {
            assert.equal(buildFilter(null), null);
            assert.equal(buildFilter(undefined), null);
            assert.equal(buildFilter(''), null);
        });

        it('returns a compiled matcher for a non-empty filter', function () {
            const compiled = buildFilter('featured:true');
            assert.equal(typeof compiled.queryJSON, 'function');
        });
    });

    describe('filterMatches', function () {
        it('always matches when the filter is null (unfiltered router)', function () {
            assert.equal(filterMatches(null, {anything: true}), true);
        });

        it('evaluates a simple boolean filter', function () {
            const compiled = buildFilter('featured:true');
            assert.equal(filterMatches(compiled, {featured: true}), true);
            assert.equal(filterMatches(compiled, {featured: false}), false);
        });

        it('expands shorthand tag filters to tags.slug', function () {
            const compiled = buildFilter('tag:news');
            assert.equal(filterMatches(compiled, {tags: [{slug: 'news'}]}), true);
            assert.equal(filterMatches(compiled, {tags: [{slug: 'sport'}]}), false);
            // A record missing the tags relation can't satisfy a tag filter.
            assert.equal(filterMatches(compiled, {}), false);
        });

        it('expands shorthand author filters to authors.slug', function () {
            const compiled = buildFilter('author:jane');
            assert.equal(filterMatches(compiled, {authors: [{slug: 'jane'}]}), true);
            assert.equal(filterMatches(compiled, {authors: [{slug: 'bob'}]}), false);
        });

        it('rewrites page:false to the singular type:post', function () {
            const compiled = buildFilter('page:false');
            assert.equal(filterMatches(compiled, {type: 'post'}), true);
            assert.equal(filterMatches(compiled, {type: 'page'}), false);
        });

        it('rewrites page:true to the singular type:page', function () {
            const compiled = buildFilter('page:true');
            assert.equal(filterMatches(compiled, {type: 'page'}), true);
            assert.equal(filterMatches(compiled, {type: 'post'}), false);
        });

        it('treats a filter that throws while evaluating as a non-match', function () {
            const throwingFilter = {
                queryJSON() {
                    throw new Error('boom');
                }
            };
            assert.equal(filterMatches(throwingFilter, {}), false);
        });
    });

    describe('EXPANSIONS', function () {
        it('exposes the shared expansion table used by the eager generator', function () {
            const keys = EXPANSIONS.map(e => e.key);
            assert.deepEqual(keys.sort(), ['author', 'authors', 'primary_author', 'primary_tag', 'tag', 'tags']);
        });
    });
});
