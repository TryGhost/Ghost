const assert = require('node:assert/strict');
const LazyUrlGenerator = require('../../../../../../core/server/services/url/lazy/lazy-url-generator');

describe('Unit: services/url/lazy/LazyUrlGenerator', function () {
    it('compiles its permalink at construction', function () {
        const gen = new LazyUrlGenerator({
            identifier: 'r',
            resourceType: 'posts',
            permalink: '/:slug/',
            position: 0
        });

        assert.ok(gen.compiledPermalink);
        assert.equal(gen.compiledPermalink.forwardLookupSafe, true);
        assert.equal(gen.compiledPermalink.lookupField, 'slug');
    });

    describe('generateUrl()', function () {
        it('substitutes :slug with the resource slug', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/:slug/',
                position: 0
            });

            assert.equal(gen.generateUrl({slug: 'my-post'}), '/my-post/');
        });

        it('substitutes date placeholders using published_at and timezone', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/:year/:month/:day/:slug/',
                position: 0,
                getTimezone: () => 'UTC'
            });

            const url = gen.generateUrl({
                slug: 'release-notes',
                published_at: '2026-04-26T10:00:00Z'
            });
            assert.equal(url, '/2026/04/26/release-notes/');
        });
    });

    describe('matchUrl()', function () {
        it('returns the captured groups when the URL matches', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/blog/:slug/',
                position: 0
            });

            const m = gen.matchUrl('/blog/my-post/');
            assert.ok(m);
            assert.equal(m.slug, 'my-post');
        });

        it('returns null when the URL does not match', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/blog/:slug/',
                position: 0
            });

            assert.equal(gen.matchUrl('/news/my-post/'), null);
        });

        it('returns null for permalinks that are not forward-lookup safe', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/:year/:month/',
                position: 0
            });

            assert.equal(gen.matchUrl('/2026/04/'), null);
        });
    });

    describe('inherits from BaseUrlGenerator', function () {
        it('exposes matches() with NQL filter semantics', function () {
            const gen = new LazyUrlGenerator({
                identifier: 'r',
                filter: 'featured:true',
                resourceType: 'posts',
                permalink: '/:slug/',
                position: 0
            });

            assert.equal(gen.matches({featured: true}), true);
            assert.equal(gen.matches({featured: false}), false);
        });
    });
});
