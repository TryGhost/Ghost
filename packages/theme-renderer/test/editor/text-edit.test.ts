// Slice 3 (editor spike): the loop's edit half.
//
// `applyTextEdit(source, {line, column}, newText)` takes a marker position
// (from `parseEditMarker`, pointing at the `<` of an element's open tag in the
// ORIGINAL theme source) and replaces the element's immediate text child.
// `applyThemeTextEdit(theme, marker, newText)` is the ThemeFiles-level wrapper
// the editor loop uses: look up `marker.file`, apply, return a NEW files
// object for a NEW renderer (docs/markers.md — resetCache() does not
// re-register partials; a fresh renderer per edit is the supported path).
//
// Deliberately small and honest (see src/editor/text-edit.ts for the limits):
// it replaces the run of plain text and inline mustache expressions directly
// after the open tag, stopping at the first nested tag or block helper.
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {
    TemplateEngine,
    applyTextEdit,
    applyThemeTextEdit,
    injectEditMarkers,
    parseEditMarker,
    type TemplateResolver
} from '../../src/index.ts';

describe('applyTextEdit', function () {
    it('replaces a static text child', function () {
        assert.equal(
            applyTextEdit('<a class="gh-head-link" href="#">Sign in</a>', {line: 1, column: 1}, 'Log in'),
            '<a class="gh-head-link" href="#">Log in</a>'
        );
    });

    it('replaces a mustache-only text child (Casper site-title shape)', function () {
        assert.equal(
            applyTextEdit('<h1 class="site-title">{{@site.title}}</h1>', {line: 1, column: 1}, 'My New Title'),
            '<h1 class="site-title">My New Title</h1>'
        );
    });

    it('edits the element at the marker position, not the first tag in the file', function () {
        const source = [
            '<div class="wrap">',
            '  <p>old text</p>',
            '  <p>keep me</p>',
            '</div>'
        ].join('\n');
        assert.equal(applyTextEdit(source, {line: 2, column: 3}, 'new text'), [
            '<div class="wrap">',
            '  <p>new text</p>',
            '  <p>keep me</p>',
            '</div>'
        ].join('\n'));
    });

    it('preserves leading/trailing whitespace around the text child', function () {
        const source = [
            '<h2 class="post-card-title">',
            '    {{title}}',
            '</h2>'
        ].join('\n');
        assert.equal(applyTextEdit(source, {line: 1, column: 1}, 'Edited'), [
            '<h2 class="post-card-title">',
            '    Edited',
            '</h2>'
        ].join('\n'));
    });

    it('replaces mixed text + inline mustaches, stopping at the first nested tag', function () {
        assert.equal(
            applyTextEdit('<p>Hello {{name}} <span>unchanged</span></p>', {line: 1, column: 1}, 'Bye'),
            '<p>Bye <span>unchanged</span></p>'
        );
    });

    it('handles mustache blocks and quoted ">" inside the open tag itself', function () {
        assert.equal(
            applyTextEdit('<div {{#if x}}class="a"{{/if}} title="a>b">Text</div>', {line: 1, column: 1}, 'New'),
            '<div {{#if x}}class="a"{{/if}} title="a>b">New</div>'
        );
    });

    it('round-trips with a marker parsed from injectEditMarkers output', function () {
        const source = '<main>\n  <a href="{{url}}">{{title}}</a>\n</main>';
        const marked = injectEditMarkers(source, 'index.hbs');
        const value = / data-edit="(index\.hbs:2:3)"/.exec(marked)![1]!;
        const marker = parseEditMarker(value)!;
        assert.equal(
            applyTextEdit(source, marker, 'clicked'),
            '<main>\n  <a href="{{url}}">clicked</a>\n</main>'
        );
    });

    // Anchor verification: the editor knows the clicked element's tag name, so
    // an edit is only applied when the expected `<tagname` bytes are actually
    // at the marker position — a mismatch means the marker is STALE (e.g. an
    // earlier edit in a multi-edit batch shifted later positions). A stale
    // marker fails loudly, after a bounded re-locate attempt: the expected tag
    // within ±3 lines, applied only when exactly one candidate matches.
    describe('anchor verification (stale markers)', function () {
        const source = [
            '<section class="feed">',
            '  <h2 class="card-title">{{title}}</h2>',
            '  <p class="excerpt">{{excerpt}}</p>',
            '</section>'
        ].join('\n');

        it('applies when the anchored tag is at the marker position', function () {
            assert.equal(applyTextEdit(source, {line: 2, column: 3}, 'Edited', {tagName: 'h2'}), [
                '<section class="feed">',
                '  <h2 class="card-title">Edited</h2>',
                '  <p class="excerpt">{{excerpt}}</p>',
                '</section>'
            ].join('\n'));
        });

        it('anchor tag names are case-insensitive (DOM tagName is uppercase)', function () {
            assert.ok(applyTextEdit(source, {line: 2, column: 3}, 'Edited', {tagName: 'H2'}).includes('>Edited</h2>'));
        });

        it('re-locates a shifted marker when exactly one anchored tag is within ±3 lines', function () {
            // an earlier edit in the batch inserted a line ABOVE the target,
            // so the captured marker's line is off by one
            const shifted = '{{!-- inserted by an earlier edit --}}\n' + source;
            assert.equal(applyTextEdit(shifted, {line: 2, column: 3}, 'Edited', {tagName: 'h2'}), [
                '{{!-- inserted by an earlier edit --}}',
                '<section class="feed">',
                '  <h2 class="card-title">Edited</h2>',
                '  <p class="excerpt">{{excerpt}}</p>',
                '</section>'
            ].join('\n'));
        });

        it('fails loudly on a stale marker with no anchored tag nearby', function () {
            // marker says h2, but the position (and its whole neighborhood)
            // has no <h2 — refuse rather than edit the wrong element
            assert.throws(() => applyTextEdit(source, {line: 3, column: 3}, 'x', {tagName: 'aside'}), /stale/);
        });

        it('fails loudly when the re-locate window is ambiguous', function () {
            const twins = [
                '<ul>',
                '  <li class="a">one</li>',
                '  <li class="b">two</li>',
                '</ul>'
            ].join('\n');
            // marker points at the <ul> line but claims <li> — two candidates
            // within the window, no safe pick
            assert.throws(() => applyTextEdit(twins, {line: 1, column: 1}, 'x', {tagName: 'li'}), /stale/);
        });

        it('does not re-locate to a longer tag name sharing the anchored prefix', function () {
            const tricky = '<h1 class="x">{{a}}</h1>\n<h1 class="y">{{b}}</h1>';
            // anchor "h" must not match <h1
            assert.throws(() => applyTextEdit(tricky, {line: 1, column: 1}, 'x', {tagName: 'h'}), /stale/);
        });
    });

    describe('errors (marker positions the editor must treat as not editable)', function () {
        const shouldThrow = (source: string, position: {line: number; column: number}, pattern: RegExp): void => {
            assert.throws(() => applyTextEdit(source, position, 'x'), pattern);
        };

        it('rejects a position that is not an element open tag', function () {
            shouldThrow('plain text', {line: 1, column: 1}, /open tag/);
            shouldThrow('</p>', {line: 1, column: 1}, /open tag/);
            shouldThrow('<!-- c -->', {line: 1, column: 1}, /open tag/);
            shouldThrow('<!DOCTYPE html>', {line: 1, column: 1}, /open tag/);
        });

        it('rejects an out-of-range position', function () {
            shouldThrow('<p>x</p>', {line: 5, column: 1}, /outside/);
            shouldThrow('<p>x</p>', {line: 1, column: 99}, /outside/);
        });

        it('rejects void and self-closing elements (no text child)', function () {
            shouldThrow('<hr>', {line: 1, column: 1}, /no text child/);
            shouldThrow('<img src="{{img_url a}}">', {line: 1, column: 1}, /no text child/);
            shouldThrow('<my-el />', {line: 1, column: 1}, /no text child/);
        });

        it('rejects rawtext elements (script/style/textarea/title)', function () {
            shouldThrow('<script>var a = 1;</script>', {line: 1, column: 1}, /rawtext/);
            shouldThrow('<style>.a{}</style>', {line: 1, column: 1}, /rawtext/);
        });

        it('rejects elements whose content starts with a block helper (Casper post-card-title shape)', function () {
            const source = [
                '<h2 class="post-card-title">',
                '    {{#unless access}}{{> "icons/lock"}}{{/unless}}',
                '    {{title}}',
                '</h2>'
            ].join('\n');
            // Replacing across a {{#block}} boundary could orphan its {{/close}}
            // and break the template — refused, not attempted.
            shouldThrow(source, {line: 1, column: 1}, /no editable text/);
        });

        it('rejects an element with no text before its first child element', function () {
            shouldThrow('<div>\n  <span>x</span>\n</div>', {line: 1, column: 1}, /no editable text/);
            shouldThrow('<div></div>', {line: 1, column: 1}, /no editable text/);
        });

        it('rejects an unterminated open tag', function () {
            shouldThrow('<div class="x"', {line: 1, column: 1}, /unterminated/i);
        });
    });
});

describe('applyThemeTextEdit', function () {
    const theme = {
        'index.hbs': '<h1 class="site-title">{{@site.title}}</h1>',
        'partials/card.hbs': '<article class="card">{{title}}</article>'
    };

    it('returns a NEW files object with only the marker file edited', function () {
        const edited = applyThemeTextEdit(theme, {file: 'partials/card.hbs', line: 1, column: 1}, 'Same Text');
        assert.notEqual(edited, theme);
        assert.equal(edited['partials/card.hbs'], '<article class="card">Same Text</article>');
        assert.equal(edited['index.hbs'], theme['index.hbs']);
        // the input is never mutated
        assert.equal(theme['partials/card.hbs'], '<article class="card">{{title}}</article>');
    });

    it('supports Map-shaped ThemeFiles', function () {
        const map = new Map(Object.entries(theme));
        const edited = applyThemeTextEdit(map, {file: 'index.hbs', line: 1, column: 1}, 'Hello');
        assert.ok(edited instanceof Map);
        assert.equal(edited.get('index.hbs'), '<h1 class="site-title">Hello</h1>');
        assert.equal(map.get('index.hbs'), theme['index.hbs']);
    });

    it('passes the anchor through (stale marker fails at theme level too)', function () {
        assert.equal(
            applyThemeTextEdit(theme, {file: 'index.hbs', line: 1, column: 1}, 'Hi', {tagName: 'h1'})['index.hbs'],
            '<h1 class="site-title">Hi</h1>'
        );
        assert.throws(
            () => applyThemeTextEdit(theme, {file: 'index.hbs', line: 1, column: 1}, 'Hi', {tagName: 'h6'}),
            /stale/
        );
    });

    it('rejects a marker pointing at a file the theme does not contain', function () {
        assert.throws(
            () => applyThemeTextEdit(theme, {file: 'partials/missing.hbs', line: 1, column: 1}, 'x'),
            /partials\/missing\.hbs/
        );
    });
});

// The repeated-element case, at engine level: every {{#foreach}} iteration of a
// partial carries the SAME marker (docs/markers.md), so editing that one
// source location changes ALL rendered iterations — correct for this slice,
// the cards genuinely share one source position.
describe('edit loop over repeated elements (engine level)', function () {
    function createResolver(files: Record<string, string>): TemplateResolver {
        return {
            resolve: name => files[name],
            list: () => Object.keys(files)
        };
    }

    function createMarkerEngine(files: Record<string, string>): TemplateEngine {
        return new TemplateEngine(createResolver(files), {
            onCompile(self, source, filename) {
                const compileSource = filename ? injectEditMarkers(source, filename) : source;
                return self.handlebars.compile(compileSource, {preventIndent: true});
            }
        });
    }

    it('editing one marker location changes every loop iteration', async function () {
        const files: Record<string, string> = {
            'index.hbs': '<main>{{#each posts}}{{> "card"}}{{/each}}</main>',
            'partials/card.hbs': '<article class="card">{{title}}</article>'
        };
        const posts = {posts: [{title: 'First'}, {title: 'Second'}, {title: 'Third'}]};

        const html = await createMarkerEngine(files).render('index.hbs', posts);

        // every iteration carries the same marker...
        const markers = [...html.matchAll(/<article data-edit="([^"]+)"/g)].map(m => m[1]);
        assert.equal(markers.length, 3);
        assert.deepEqual([...new Set(markers)], ['partials/card.hbs:1:1']);

        // ...so one edit at that marker, plus a NEW engine over the edited
        // files (fresh renderer per edit — the supported path), changes all
        const marker = parseEditMarker(markers[0]!)!;
        const edited = applyThemeTextEdit(files, marker, 'Same Text', {tagName: 'article'});
        const editedHtml = await createMarkerEngine(edited).render('index.hbs', posts);

        assert.equal([...editedHtml.matchAll(/>Same Text<\/article>/g)].length, 3);
        assert.ok(!editedHtml.includes('First') && !editedHtml.includes('Second'));
    });
});
