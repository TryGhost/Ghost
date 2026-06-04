const assert = require('node:assert/strict');
const {
    EXPANSIONS,
    routerTypeOf,
    buildFilter,
    filterMatches
} = require('../../../../../core/server/services/url/router-filter');

describe('router-filter', function () {
    describe('routerTypeOf', function () {
        it('maps singular DB types to plural router types', function () {
            assert.equal(routerTypeOf({type: 'post'}), 'posts');
            assert.equal(routerTypeOf({type: 'page'}), 'pages');
            assert.equal(routerTypeOf({type: 'tag'}), 'tags');
            assert.equal(routerTypeOf({type: 'author'}), 'authors');
        });

        it('passes plural router types through unchanged', function () {
            assert.equal(routerTypeOf({type: 'posts'}), 'posts');
            assert.equal(routerTypeOf({type: 'pages'}), 'pages');
            assert.equal(routerTypeOf({type: 'tags'}), 'tags');
            assert.equal(routerTypeOf({type: 'authors'}), 'authors');
        });

        it('returns null for unknown or missing types', function () {
            assert.equal(routerTypeOf({type: 'widgets'}), null);
            assert.equal(routerTypeOf({}), null);
            assert.equal(routerTypeOf(null), null);
            assert.equal(routerTypeOf(undefined), null);
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
        it('always matches when there is no compiled filter', function () {
            assert.equal(filterMatches(null, {anything: true}), true);
        });

        it('evaluates a simple boolean filter', function () {
            const compiled = buildFilter('featured:true');
            assert.equal(filterMatches(compiled, {featured: true}), true);
            assert.equal(filterMatches(compiled, {featured: false}), false);
        });

        it('expands tag shorthand to tags.slug', function () {
            const compiled = buildFilter('tag:news');
            assert.equal(filterMatches(compiled, {tags: [{slug: 'news'}]}), true);
            assert.equal(filterMatches(compiled, {tags: [{slug: 'sport'}]}), false);
        });

        it('expands author shorthand to authors.slug', function () {
            const compiled = buildFilter('author:jane');
            assert.equal(filterMatches(compiled, {authors: [{slug: 'jane'}]}), true);
            assert.equal(filterMatches(compiled, {authors: [{slug: 'bob'}]}), false);
        });

        it('expands primary_tag shorthand', function () {
            const compiled = buildFilter('primary_tag:news');
            assert.equal(filterMatches(compiled, {primary_tag: {slug: 'news'}}), true);
            assert.equal(filterMatches(compiled, {primary_tag: {slug: 'other'}}), false);
        });

        it('transforms page:false to type:post', function () {
            const compiled = buildFilter('page:false');
            assert.equal(filterMatches(compiled, {type: 'post'}), true);
            assert.equal(filterMatches(compiled, {type: 'page'}), false);
        });

        it('transforms page:true to type:page', function () {
            const compiled = buildFilter('page:true');
            assert.equal(filterMatches(compiled, {type: 'page'}), true);
            assert.equal(filterMatches(compiled, {type: 'post'}), false);
        });

        it('returns false (does not throw) when the record lacks a referenced relation', function () {
            const compiled = buildFilter('tag:news');
            assert.equal(filterMatches(compiled, {id: 'p1'}), false);
        });
    });

    describe('EXPANSIONS', function () {
        it('exposes the shorthand keys the eager generator supports', function () {
            const keys = EXPANSIONS.map(e => e.key);
            assert.deepEqual(
                keys,
                ['author', 'tags', 'tag', 'authors', 'primary_tag', 'primary_author']
            );
        });
    });
});
