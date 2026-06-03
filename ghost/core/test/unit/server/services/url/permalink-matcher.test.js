const assert = require('node:assert/strict');
const {matchPermalink} = require('../../../../../core/server/services/url/permalink-matcher');

describe('permalink-matcher', function () {
    describe('matchPermalink', function () {
        it('captures a single placeholder', function () {
            assert.deepEqual(matchPermalink('/:slug/', '/hello/'), {slug: 'hello'});
        });

        it('captures multiple placeholders in order', function () {
            assert.deepEqual(
                matchPermalink('/:year/:month/:slug/', '/2026/04/hello/'),
                {year: '2026', month: '04', slug: 'hello'}
            );
        });

        it('captures mixed literal and placeholder segments', function () {
            assert.deepEqual(
                matchPermalink('/:primary_tag/:slug/', '/podcast/hello/'),
                {primary_tag: 'podcast', slug: 'hello'}
            );
        });

        it('matches a purely literal template and returns empty params', function () {
            assert.deepEqual(matchPermalink('/about/', '/about/'), {});
        });

        it('returns null when a literal segment differs', function () {
            assert.equal(matchPermalink('/blog/:slug/', '/news/hello/'), null);
        });

        it('returns null when the segment counts differ', function () {
            assert.equal(matchPermalink('/:slug/', '/a/b/'), null);
            assert.equal(matchPermalink('/:year/:slug/', '/hello/'), null);
        });

        it('returns null for an empty path segment under a placeholder', function () {
            assert.equal(matchPermalink('/:slug/', '//'), null);
        });

        it('rejects a segment that mixes a literal and a placeholder', function () {
            assert.equal(matchPermalink('/blog-:slug/', '/blog-hello/'), null);
        });

        it('decodes percent-encoded path segments', function () {
            assert.deepEqual(matchPermalink('/:slug/', '/hello%20world/'), {slug: 'hello world'});
        });

        it('returns null (does not throw) on malformed percent-escapes', function () {
            assert.equal(matchPermalink('/:slug/', '/foo%ZZ/'), null);
        });

        it('returns null for non-string inputs', function () {
            assert.equal(matchPermalink(null, '/hello/'), null);
            assert.equal(matchPermalink('/:slug/', null), null);
            assert.equal(matchPermalink(undefined, undefined), null);
        });
    });
});
