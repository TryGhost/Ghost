const assert = require('node:assert/strict');
const {compilePermalink} = require('../../../../../../core/server/services/url/lazy/permalink-matcher');

describe('Unit: services/url/lazy/permalink-matcher', function () {
    describe('compilePermalink', function () {
        it('compiles /:slug/ into a regex with a slug capture group', function () {
            const compiled = compilePermalink('/:slug/');
            const m = compiled.regex.exec('/my-post/');
            assert.ok(m, 'expected match');
            assert.equal(m.groups.slug, 'my-post');
            assert.deepEqual(compiled.fields.sort(), ['slug']);
        });

        it('rejects non-slug paths', function () {
            const compiled = compilePermalink('/:slug/');
            assert.equal(compiled.regex.exec('/two/segments/'), null);
            assert.equal(compiled.regex.exec('/my-post'), null, 'missing trailing slash');
            assert.equal(compiled.regex.exec('my-post/'), null, 'missing leading slash');
        });

        it('compiles dated permalinks with strict numeric segments', function () {
            const compiled = compilePermalink('/:year/:month/:day/:slug/');
            const m = compiled.regex.exec('/2026/04/26/release-notes/');
            assert.ok(m);
            assert.equal(m.groups.year, '2026');
            assert.equal(m.groups.month, '04');
            assert.equal(m.groups.day, '26');
            assert.equal(m.groups.slug, 'release-notes');
            assert.deepEqual(compiled.fields.sort(), ['day', 'month', 'slug', 'year']);

            // Invalid date formats must not match
            assert.equal(compiled.regex.exec('/26/04/26/release-notes/'), null, '2-digit year rejected');
            assert.equal(compiled.regex.exec('/2026/4/26/release-notes/'), null, '1-digit month rejected');
            assert.equal(compiled.regex.exec('/2026/04/abc/release-notes/'), null, 'non-numeric day rejected');
        });

        it('compiles /tag/:slug/ into an anchored regex', function () {
            const compiled = compilePermalink('/tag/:slug/');
            assert.ok(compiled.regex.exec('/tag/news/'));
            assert.equal(compiled.regex.exec('/tag/news/extra/'), null);
            assert.equal(compiled.regex.exec('/prefix/tag/news/'), null);
        });

        it('compiles permalinks with primary_tag and primary_author', function () {
            const tagged = compilePermalink('/:primary_tag/:slug/');
            const tm = tagged.regex.exec('/news/release-notes/');
            assert.ok(tm);
            assert.equal(tm.groups.primary_tag, 'news');
            assert.equal(tm.groups.slug, 'release-notes');

            const authored = compilePermalink('/:primary_author/:slug/');
            const am = authored.regex.exec('/jane-doe/release-notes/');
            assert.ok(am);
            assert.equal(am.groups.primary_author, 'jane-doe');
            assert.equal(am.groups.slug, 'release-notes');
        });

        it('compiles permalinks with :id', function () {
            const compiled = compilePermalink('/p/:id/');
            const m = compiled.regex.exec('/p/507f1f77bcf86cd799439011/');
            assert.ok(m);
            assert.equal(m.groups.id, '507f1f77bcf86cd799439011');
        });

        it('escapes regex metacharacters in literal segments', function () {
            const compiled = compilePermalink('/blog.archive/:slug/');
            assert.ok(compiled.regex.exec('/blog.archive/my-post/'));
            // The literal '.' must not act as a regex wildcard
            assert.equal(compiled.regex.exec('/blogXarchive/my-post/'), null);
        });

        it('throws when permalink lacks leading or trailing slash', function () {
            assert.throws(() => compilePermalink('foo/:slug/'), /leading slash/i);
            assert.throws(() => compilePermalink('/foo/:slug'), /trailing slash/i);
        });

        it('throws when permalink uses an unsupported placeholder', function () {
            assert.throws(() => compilePermalink('/:uuid/'), /unsupported placeholder/i);
            assert.throws(() => compilePermalink('/:nope/'), /unsupported placeholder/i);
        });
    });

    describe('forward lookup safety', function () {
        it('marks permalinks with :slug as forward-lookup safe', function () {
            const compiled = compilePermalink('/:year/:slug/');
            assert.equal(compiled.forwardLookupSafe, true);
            assert.equal(compiled.lookupField, 'slug');
        });

        it('marks permalinks with :id as forward-lookup safe', function () {
            const compiled = compilePermalink('/p/:id/');
            assert.equal(compiled.forwardLookupSafe, true);
            assert.equal(compiled.lookupField, 'id');
        });

        it('marks permalinks without :slug or :id as not forward-lookup safe', function () {
            const compiled = compilePermalink('/:year/:month/');
            assert.equal(compiled.forwardLookupSafe, false);
        });
    });
});
