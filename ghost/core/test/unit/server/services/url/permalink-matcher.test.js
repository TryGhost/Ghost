const assert = require('node:assert/strict');
const {matchPermalink} = require('../../../../../core/server/services/url/permalink-matcher');

describe('permalink-matcher', function () {
    describe('single-segment templates', function () {
        it('captures a :slug placeholder', function () {
            assert.deepEqual(matchPermalink('/:slug/', '/hello/'), {slug: 'hello'});
        });

        it('returns an empty params object for a fully literal template', function () {
            assert.deepEqual(matchPermalink('/about/', '/about/'), {});
        });

        it('returns null when a literal segment differs', function () {
            assert.equal(matchPermalink('/about/', '/hello/'), null);
        });

        it('returns null for an empty placeholder segment', function () {
            assert.equal(matchPermalink('/:slug/', '//'), null);
        });
    });

    describe('multi-segment templates', function () {
        it('captures multiple placeholders', function () {
            assert.deepEqual(
                matchPermalink('/:primary_tag/:slug/', '/podcast/hello/'),
                {primary_tag: 'podcast', slug: 'hello'}
            );
        });

        it('captures date-based placeholders', function () {
            assert.deepEqual(
                matchPermalink('/:year/:month/:slug/', '/2026/04/hello/'),
                {year: '2026', month: '04', slug: 'hello'}
            );
        });

        it('mixes literals and placeholders across segments', function () {
            assert.deepEqual(
                matchPermalink('/blog/:slug/', '/blog/hello/'),
                {slug: 'hello'}
            );
        });

        it('returns null when segment counts differ', function () {
            assert.equal(matchPermalink('/:slug/', '/a/b/'), null);
            assert.equal(matchPermalink('/:year/:slug/', '/2026/'), null);
        });
    });

    describe('decoding', function () {
        it('percent-decodes captured segments', function () {
            assert.deepEqual(matchPermalink('/:slug/', '/hello%20world/'), {slug: 'hello world'});
        });

        it('returns null (does not throw) on malformed %-escapes', function () {
            assert.equal(matchPermalink('/:slug/', '/foo%ZZ/'), null);
        });
    });

    describe('unsupported shapes', function () {
        it('rejects mixed literal-and-placeholder segments', function () {
            assert.equal(matchPermalink('/blog-:slug/', '/blog-hello/'), null);
        });

        it('rejects placeholders with non-word characters', function () {
            assert.equal(matchPermalink('/:sl-ug/', '/hello/'), null);
        });
    });

    describe('guards', function () {
        it('returns null when either argument is not a string', function () {
            assert.equal(matchPermalink(null, '/hello/'), null);
            assert.equal(matchPermalink('/:slug/', null), null);
            assert.equal(matchPermalink(undefined, undefined), null);
        });
    });
});
