const assert = require('node:assert/strict');
const {matchPermalink, toLookupParams} = require('../../../../../core/server/services/url/permalink-matcher');

function captured(template, urlPath) {
    const result = matchPermalink(template, urlPath);
    return result === null ? null : {...result};
}

describe('permalink-matcher', function () {
    describe('single-segment templates', function () {
        it('captures a :slug placeholder', function () {
            assert.deepEqual(captured('/:slug/', '/hello/'), {slug: 'hello'});
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
                captured('/:primary_tag/:slug/', '/podcast/hello/'),
                {primary_tag: 'podcast', slug: 'hello'}
            );
        });

        it('captures date-based placeholders', function () {
            assert.deepEqual(
                captured('/:year/:month/:slug/', '/2026/04/hello/'),
                {year: '2026', month: '04', slug: 'hello'}
            );
        });

        it('mixes literals and placeholders across segments', function () {
            assert.deepEqual(
                captured('/blog/:slug/', '/blog/hello/'),
                {slug: 'hello'}
            );
        });

        it('returns null when segment counts differ', function () {
            assert.equal(matchPermalink('/:slug/', '/a/b/'), null);
            assert.equal(matchPermalink('/:year/:slug/', '/2026/'), null);
        });
    });

    describe('queryable column required', function () {
        it('returns null for a fully literal template', function () {
            assert.equal(matchPermalink('/about/', '/about/'), null);
        });

        it('returns null for a template that captures only derived segments', function () {
            assert.equal(matchPermalink('/:year/:month/', '/2026/04/'), null);
        });
    });

    describe('multi-token segments (#28076)', function () {
        it('captures hyphen-separated params within one segment', function () {
            assert.deepEqual(
                captured('/:year-:month-:day-:slug/', '/2026-04-15-hello/'),
                {year: '2026', month: '04', day: '15', slug: 'hello'}
            );
        });

        it('does not let an earlier param consume a later one across hyphens', function () {
            // Without explicit bounds, :year would greedily swallow the whole
            // segment. Each hyphenated param must stop at its own boundary.
            assert.deepEqual(
                captured('/:slug-:primary_tag/', '/hello-podcast/'),
                {slug: 'hello', primary_tag: 'podcast'}
            );
        });

        it('captures a literal-prefixed placeholder segment', function () {
            assert.deepEqual(captured('/blog-:slug/', '/blog-hello/'), {slug: 'hello'});
        });
    });

    describe('decoding', function () {
        it('percent-decodes captured segments', function () {
            assert.deepEqual(captured('/:slug/', '/hello%20world/'), {slug: 'hello world'});
        });

        it('returns null (does not throw) on malformed %-escapes', function () {
            assert.equal(matchPermalink('/:slug/', '/foo%ZZ/'), null);
        });
    });

    describe('supported tokens only', function () {
        // The matcher only recognises Ghost's documented permalink tokens, so an
        // unknown :token (including reserved names like __proto__) never matches
        // and can never reach the lookup or a cache key.
        it('returns null for an unsupported token', function () {
            assert.equal(matchPermalink('/:foo/', '/hello/'), null);
        });

        it('returns null for a placeholder named __proto__', function () {
            assert.equal(matchPermalink('/:__proto__/', '/hello/'), null);
        });
    });

    describe('value-format pre-filter', function () {
        // A captured value that can't fit its token's fixed format is a
        // guaranteed miss, so the matcher rejects it up front (parity-safe: the
        // patterns are strict supersets of every value eager emits).
        it('returns null when an :id segment is not a 24-char ObjectId', function () {
            assert.equal(matchPermalink('/:id/', '/blahblah/'), null);
        });

        it('matches when an :id segment is a valid ObjectId', function () {
            assert.deepEqual(
                captured('/:id/', '/0123456789abcdef01234567/'),
                {id: '0123456789abcdef01234567'}
            );
        });

        it('returns null when a date segment is not numeric', function () {
            assert.equal(matchPermalink('/:year/:month/:slug/', '/notayear/04/hello/'), null);
        });
    });

    describe('toLookupParams', function () {
        it('narrows to slug when present', function () {
            assert.deepEqual(toLookupParams({slug: 'hello', primary_tag: 'podcast'}), {slug: 'hello'});
        });

        it('narrows to id when present', function () {
            assert.deepEqual(toLookupParams({id: '0123456789abcdef01234567'}), {id: '0123456789abcdef01234567'});
        });

        it('prefers id over slug', function () {
            assert.deepEqual(toLookupParams({id: '0123456789abcdef01234567', slug: 'hello'}), {id: '0123456789abcdef01234567'});
        });
    });
});
