const assert = require('node:assert/strict');
const {matchPermalink} = require('../../../../../core/server/services/url/permalink-matcher');

function captured(template, urlPath) {
    const result = matchPermalink(template, urlPath);
    return result === null ? null : {...result};
}

describe('permalink-matcher', function () {
    describe('single-segment templates', function () {
        it('captures a :slug placeholder', function () {
            assert.deepEqual(captured('/:slug/', '/hello/'), {slug: 'hello'});
        });

        it('returns an empty params object for a fully literal template', function () {
            assert.deepEqual(captured('/about/', '/about/'), {});
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

    describe('decoding', function () {
        it('percent-decodes captured segments', function () {
            assert.deepEqual(captured('/:slug/', '/hello%20world/'), {slug: 'hello world'});
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

    describe('reserved placeholder names', function () {
        // A plain object would route `params.__proto__ = ...` through the
        // Object.prototype setter and drop the capture; the null-prototype map
        // stores it as an own key so the downstream lookup/cache key sees it.
        it('captures a placeholder named __proto__ as an own key', function () {
            const result = matchPermalink('/:__proto__/', '/hello/');

            assert.deepEqual(Object.keys(result), ['__proto__']);
            assert.equal(result.__proto__, 'hello');
            assert.equal(JSON.stringify(result), '{"__proto__":"hello"}');
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
