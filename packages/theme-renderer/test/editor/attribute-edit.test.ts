// Slice 5 (image swaps): the attribute-edit half of the anchored applier.
//
// `applyAttributeEdit(source, {line, column}, {name, value}, anchor?)` takes a
// marker position (the 1-based position of an element's `<` in the ORIGINAL
// theme source, docs/markers.md) and sets, replaces, or — with `value: null` —
// deletes the named attribute on that open tag ONLY. It shares the source
// scanner and the exact anchor/stale-marker rules of applyTextEdit, and obeys
// the same no-line-drift invariant: an attribute edit never adds or removes
// lines, even when the replaced or deleted attribute value spans several.
// `applyThemeAttributeEdit(theme, marker, edit, anchor?)` is the ThemeFiles
// wrapper (new files object for a new renderer, input never mutated).
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {injectEditMarkers, parseEditMarker} from '../../src/index.ts';
// the edit half lives on the './editor' subpath export, not the package root
import {applyAttributeEdit, applyAttributeEdits, applyThemeAttributeEdit, applyThemeAttributeEdits} from '../../src/editor/attribute-edit.ts';

const AT = {line: 1, column: 1};

describe('applyAttributeEdit', function () {
    describe('replacing an existing attribute', function () {
        it('replaces a double-quoted value in place', function () {
            assert.equal(
                applyAttributeEdit('<img class="hero" src="/old.jpg" alt="a">', AT, {name: 'src', value: '/content/images/new.jpg'}),
                '<img class="hero" src="/content/images/new.jpg" alt="a">'
            );
        });

        it('replaces a value that is entirely a mustache expression (Casper img_url shape)', function () {
            assert.equal(
                applyAttributeEdit('<img src="{{img_url feature_image size="l"}}" alt="{{title}}">', AT, {name: 'src', value: '/content/images/new.jpg'}),
                '<img src="/content/images/new.jpg" alt="{{title}}">'
            );
        });

        it('leaves mustache-containing SIBLING attributes on the same tag untouched', function () {
            const source = '<img srcset="{{img_url feature_image size="s"}} 300w, {{img_url feature_image size="m"}} 600w" src="{{img_url feature_image}}" sizes="(max-width: 600px) 100vw">';
            assert.equal(
                applyAttributeEdit(source, AT, {name: 'src', value: '/new.jpg'}),
                '<img srcset="{{img_url feature_image size="s"}} 300w, {{img_url feature_image size="m"}} 600w" src="/new.jpg" sizes="(max-width: 600px) 100vw">'
            );
        });

        it('normalizes a single-quoted value to double quotes', function () {
            assert.equal(
                applyAttributeEdit(`<img src='/old.jpg'>`, AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg">'
            );
        });

        it('normalizes an unquoted value to double quotes', function () {
            assert.equal(
                applyAttributeEdit('<img src=/old.jpg alt=x>', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg" alt=x>'
            );
        });

        it('gives a bare (valueless) attribute a value', function () {
            assert.equal(
                applyAttributeEdit('<img data-lazy src="/a.jpg">', AT, {name: 'data-lazy', value: 'yes'}),
                '<img data-lazy="yes" src="/a.jpg">'
            );
        });

        it('a dynamic attribute NAME\'s value is never mistaken for attributes (data-{{x}}="src")', function () {
            // the scanner must skip the dynamic name's `=value` too — its
            // quoted content ("src") is NOT an attribute name, so the edit
            // lands on the real src attribute
            assert.equal(
                applyAttributeEdit('<img data-{{x}}="src" src="/old.jpg">', AT, {name: 'src', value: '/new.jpg'}),
                '<img data-{{x}}="src" src="/new.jpg">'
            );
        });

        it('a fully-dynamic attribute name\'s value is skipped the same way ({{x}}="src")', function () {
            assert.equal(
                applyAttributeEdit('<img {{dynamic}}="src" src="/old.jpg">', AT, {name: 'src', value: '/new.jpg'}),
                '<img {{dynamic}}="src" src="/new.jpg">'
            );
        });

        it('matches attribute names case-insensitively', function () {
            assert.equal(
                applyAttributeEdit('<img SRC="/old.jpg">', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg">'
            );
        });

        it('works on non-void elements too', function () {
            assert.equal(
                applyAttributeEdit('<a href="/old/" class="x">Link</a>', AT, {name: 'href', value: '/new/'}),
                '<a href="/new/" class="x">Link</a>'
            );
        });

        it('preserves a self-closing slash', function () {
            assert.equal(
                applyAttributeEdit('<img src="/old.jpg"/>', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg"/>'
            );
        });

        it('edits the tag at the marker position, not the first tag in the file', function () {
            const source = [
                '<figure class="wrap">',
                '  <img src="/old.jpg" alt="a">',
                '  <img src="/keep.jpg" alt="b">',
                '</figure>'
            ].join('\n');
            assert.equal(applyAttributeEdit(source, {line: 2, column: 3}, {name: 'src', value: '/new.jpg'}), [
                '<figure class="wrap">',
                '  <img src="/new.jpg" alt="a">',
                '  <img src="/keep.jpg" alt="b">',
                '</figure>'
            ].join('\n'));
        });

        it('never edits past the open tag\'s ">"', function () {
            // the src-looking text child is NOT an attribute — the missing
            // attribute is inserted (after the tag name), never matched there
            assert.equal(
                applyAttributeEdit('<div title="d">src="not an attribute"</div>', AT, {name: 'src', value: 'x'}),
                '<div src="x" title="d">src="not an attribute"</div>'
            );
        });

        it('preserves the line count when a replaced value spans lines (no-line-drift)', function () {
            const source = [
                '<img srcset="{{img_url feature_image size="s"}} 300w,',
                '             {{img_url feature_image size="m"}} 600w" src="/old.jpg">'
            ].join('\n');
            const edited = applyAttributeEdit(source, AT, {name: 'srcset', value: '/new.jpg 300w'});
            assert.equal(edited.split('\n').length, source.split('\n').length);
            assert.ok(edited.includes('srcset="/new.jpg 300w"'));
            assert.ok(edited.includes('src="/old.jpg"'), 'the sibling attribute survives');
        });

        it('round-trips with a marker parsed from injectEditMarkers output', function () {
            const source = '<main>\n  <img src="/old.jpg" alt="x">\n</main>';
            const marked = injectEditMarkers(source, 'index.hbs');
            const value = / data-edit="(index\.hbs:2:3)"/.exec(marked)![1]!;
            const marker = parseEditMarker(value)!;
            assert.equal(
                applyAttributeEdit(source, marker, {name: 'src', value: '/new.jpg'}),
                '<main>\n  <img src="/new.jpg" alt="x">\n</main>'
            );
        });
    });

    describe('inserting a missing attribute', function () {
        it('inserts immediately after the tag name (the data-edit-safe position)', function () {
            assert.equal(
                applyAttributeEdit('<img class="hero">', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg" class="hero">'
            );
        });

        it('inserts into a tag with no attributes at all', function () {
            assert.equal(
                applyAttributeEdit('<img>', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg">'
            );
            assert.equal(
                applyAttributeEdit('<img/>', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg"/>'
            );
        });

        it('inserts before attribute lists that span mustache boundaries', function () {
            assert.equal(
                applyAttributeEdit('<img {{#if wide}}class="wide"{{/if}} alt="x">', AT, {name: 'src', value: '/new.jpg'}),
                '<img src="/new.jpg" {{#if wide}}class="wide"{{/if}} alt="x">'
            );
        });
    });

    describe('deleting an attribute (value: null)', function () {
        it('removes the attribute and its preceding whitespace', function () {
            assert.equal(
                applyAttributeEdit('<img src="/a.jpg" srcset="/a-s.jpg 300w" alt="x">', AT, {name: 'srcset', value: null}),
                '<img src="/a.jpg" alt="x">'
            );
        });

        it('removes a bare attribute', function () {
            assert.equal(
                applyAttributeEdit('<img data-lazy src="/a.jpg">', AT, {name: 'data-lazy', value: null}),
                '<img src="/a.jpg">'
            );
        });

        it('removes an attribute whose value contains quoted mustache arguments', function () {
            assert.equal(
                applyAttributeEdit('<img src="/a.jpg" srcset="{{img_url feature_image size="s"}} 300w">', AT, {name: 'srcset', value: null}),
                '<img src="/a.jpg">'
            );
        });

        it('is a no-op when the attribute is absent', function () {
            const source = '<img src="/a.jpg">';
            assert.equal(applyAttributeEdit(source, AT, {name: 'srcset', value: null}), source);
        });

        it('preserves the line count when the deleted attribute spans lines (no-line-drift)', function () {
            const source = [
                '<img src="/a.jpg"',
                '     srcset="/a-s.jpg 300w,',
                '             /a-m.jpg 600w"',
                '     alt="x">'
            ].join('\n');
            const edited = applyAttributeEdit(source, AT, {name: 'srcset', value: null});
            assert.equal(edited.split('\n').length, source.split('\n').length);
            assert.ok(!edited.includes('srcset'));
            assert.ok(edited.includes('src="/a.jpg"'));
            assert.ok(edited.includes('alt="x"'));
        });
    });

    describe('value contract (plain attribute text only)', function () {
        it('rejects handlebars syntax in the value (template injection)', function () {
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: '{{@site.url}}'}), /handlebars|injection/i);
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: 'stray }} braces'}), /handlebars|injection/i);
        });

        it('rejects newlines in the value (edits must never shift line numbers)', function () {
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: 'two\nlines'}), /single line|newline/i);
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: 'two\r\nlines'}), /single line|newline/i);
        });

        it('HTML-escapes " and & so the value stays inside its double quotes', function () {
            assert.equal(
                applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: '/new.jpg?a=1&b="x"'}),
                '<img src="/new.jpg?a=1&amp;b=&quot;x&quot;">'
            );
        });

        it('does not double-escape an already-escaped ampersand source when re-editing', function () {
            const once = applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'src', value: '/new.jpg?a=1&b=2'});
            assert.equal(once, '<img src="/new.jpg?a=1&amp;b=2">');
            // a SECOND edit replaces the whole value, so escaping never stacks
            assert.equal(
                applyAttributeEdit(once, AT, {name: 'src', value: '/third.jpg'}),
                '<img src="/third.jpg">'
            );
        });
    });

    describe('attribute-name contract', function () {
        it('rejects names with quotes, spaces, equals, or angle brackets (attribute injection)', function () {
            for (const name of ['sr c', 'src=x', 'src"', `src'`, 'src>', 'src/', '', '  ', '{{src}}']) {
                assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name, value: 'x'}), /attribute name/i);
            }
        });

        it('rejects the reserved data-edit marker attribute', function () {
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg">', AT, {name: 'data-edit', value: 'x'}), /data-edit|reserved/i);
        });
    });

    describe('anchor verification (stale markers, same rules as text edits)', function () {
        const source = [
            '<figure class="feed">',
            '  <img class="card-image" src="/old.jpg">',
            '  <p class="caption">{{caption}}</p>',
            '</figure>'
        ].join('\n');

        it('applies when the anchored tag is at the marker position', function () {
            assert.ok(
                applyAttributeEdit(source, {line: 2, column: 3}, {name: 'src', value: '/new.jpg'}, {tagName: 'img'})
                    .includes('src="/new.jpg"')
            );
        });

        it('anchor tag names are case-insensitive (DOM tagName is uppercase)', function () {
            assert.ok(
                applyAttributeEdit(source, {line: 2, column: 3}, {name: 'src', value: '/new.jpg'}, {tagName: 'IMG'})
                    .includes('src="/new.jpg"')
            );
        });

        it('re-locates a shifted marker when exactly one anchored tag is within ±3 lines', function () {
            const shifted = '{{!-- inserted by an earlier edit --}}\n' + source;
            assert.ok(
                applyAttributeEdit(shifted, {line: 2, column: 3}, {name: 'src', value: '/new.jpg'}, {tagName: 'img'})
                    .includes('src="/new.jpg"')
            );
        });

        it('fails loudly on a stale marker with no anchored tag nearby', function () {
            assert.throws(
                () => applyAttributeEdit(source, {line: 3, column: 3}, {name: 'src', value: 'x'}, {tagName: 'video'}),
                /stale/
            );
        });

        it('fails loudly when the re-locate window is ambiguous', function () {
            const twins = '<div>\n  <img src="/a.jpg">\n  <img src="/b.jpg">\n</div>';
            assert.throws(
                () => applyAttributeEdit(twins, {line: 1, column: 1}, {name: 'src', value: 'x'}, {tagName: 'img'}),
                /stale/
            );
        });

        it('throws stale-marker for a line outside the file', function () {
            assert.throws(
                () => applyAttributeEdit(source, {line: 900, column: 3}, {name: 'src', value: 'x'}, {tagName: 'img'}),
                /stale/
            );
        });
    });

    describe('positions the editor must refuse', function () {
        it('rejects a position that is not an element open tag', function () {
            assert.throws(() => applyAttributeEdit('plain text', AT, {name: 'src', value: 'x'}), /open tag/);
            assert.throws(() => applyAttributeEdit('</p>', AT, {name: 'src', value: 'x'}), /open tag/);
            assert.throws(() => applyAttributeEdit('<!-- c -->', AT, {name: 'src', value: 'x'}), /open tag/);
        });

        it('rejects an out-of-range position (unanchored)', function () {
            assert.throws(() => applyAttributeEdit('<img>', {line: 5, column: 1}, {name: 'src', value: 'x'}), /outside/);
        });

        it('rejects a dynamic tag name', function () {
            assert.throws(() => applyAttributeEdit('<h{{level}}>x</h{{level}}>', AT, {name: 'id', value: 'x'}), /open tag/);
        });

        it('rejects an unterminated open tag', function () {
            assert.throws(() => applyAttributeEdit('<img src="/a.jpg', AT, {name: 'src', value: 'x'}), /unterminated/i);
        });

        it('refuses to touch an attribute that lives inside a handlebars block on the tag', function () {
            const conditional = '<img {{#if lazy}}srcset="/a-s.jpg 300w"{{/if}} src="/a.jpg">';
            assert.throws(() => applyAttributeEdit(conditional, AT, {name: 'srcset', value: 'x'}), /handlebars block/i);
            assert.throws(() => applyAttributeEdit(conditional, AT, {name: 'srcset', value: null}), /handlebars block/i);
        });

        it('still edits attributes OUTSIDE the block on the same tag', function () {
            const conditional = '<img {{#if lazy}}loading="lazy"{{/if}} src="/a.jpg">';
            assert.equal(
                applyAttributeEdit(conditional, AT, {name: 'src', value: '/new.jpg'}),
                '<img {{#if lazy}}loading="lazy"{{/if}} src="/new.jpg">'
            );
        });
    });
});

describe('applyAttributeEdits (batch)', function () {
    it('applies a whole image swap (replace src, delete srcset/sizes) in one resolution', function () {
        const {source, skipped} = applyAttributeEdits(
            '<img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w" sizes="100vw" alt="x">',
            AT,
            [
                {name: 'src', value: '/new.jpg'},
                {name: 'srcset', value: null, optional: true},
                {name: 'sizes', value: null, optional: true}
            ]
        );
        assert.equal(source, '<img class="hero" src="/new.jpg" alt="x">');
        assert.deepEqual(skipped, []);
    });

    it('matches the sequential single-edit result byte for byte', function () {
        const input = '<img src="{{img_url feature_image size="l"}}" srcset="{{img_url feature_image size="s"}} 300w" sizes="(max-width: 600px) 100vw" alt="{{title}}">';
        const sequential = applyAttributeEdit(
            applyAttributeEdit(
                applyAttributeEdit(input, AT, {name: 'src', value: '/new.jpg'}),
                AT, {name: 'srcset', value: null}
            ),
            AT, {name: 'sizes', value: null}
        );
        const batch = applyAttributeEdits(input, AT, [
            {name: 'src', value: '/new.jpg'},
            {name: 'srcset', value: null},
            {name: 'sizes', value: null}
        ]);
        assert.equal(batch.source, sequential);
    });

    it('mixes an insert with deletes at the same boundary (right-to-left splices)', function () {
        // src is MISSING (inserted at the tag name) while srcset — the first
        // attribute, whose delete walks back to the same boundary — goes away
        const {source} = applyAttributeEdits('<img srcset="/a-s.jpg 300w" alt="x">', AT, [
            {name: 'src', value: '/new.jpg'},
            {name: 'srcset', value: null}
        ]);
        assert.equal(source, '<img src="/new.jpg" alt="x">');
    });

    it('an optional edit hitting the handlebars-block refusal is skipped, not fatal', function () {
        const conditional = '<img {{#if lazy}}srcset="/a-s.jpg 300w"{{/if}} src="/old.jpg">';
        const {source, skipped} = applyAttributeEdits(conditional, AT, [
            {name: 'src', value: '/new.jpg'},
            {name: 'srcset', value: null, optional: true},
            {name: 'sizes', value: null, optional: true}
        ]);
        assert.equal(source, '<img {{#if lazy}}srcset="/a-s.jpg 300w"{{/if}} src="/new.jpg">', 'the required src swap still lands');
        assert.equal(skipped.length, 1, 'only the blocked srcset is skipped — absent sizes is a plain no-op');
        assert.equal(skipped[0]!.name, 'srcset');
        assert.match(skipped[0]!.reason, /handlebars block/i);
    });

    it('a REQUIRED edit hitting the block refusal still throws the whole batch', function () {
        const conditional = '<img {{#if lazy}}srcset="/a-s.jpg 300w"{{/if}} src="/old.jpg">';
        assert.throws(
            () => applyAttributeEdits(conditional, AT, [{name: 'srcset', value: null}]),
            /handlebars block/i
        );
    });

    it('rejects the same attribute twice in one batch', function () {
        assert.throws(
            () => applyAttributeEdits('<img src="/a.jpg">', AT, [
                {name: 'src', value: '/b.jpg'},
                {name: 'SRC', value: null}
            ]),
            /twice in one edit batch/
        );
    });

    it('validates every edit before touching anything (contract violations are batch-fatal)', function () {
        assert.throws(
            () => applyAttributeEdits('<img src="/a.jpg">', AT, [
                {name: 'src', value: '/new.jpg'},
                {name: 'srcset', value: '{{evil}}', optional: true}
            ]),
            /handlebars|injection/i,
            'optional only downgrades the block refusal — never the plain-text contract'
        );
    });
});

describe('applyThemeAttributeEdits', function () {
    const theme = {
        'index.hbs': '<img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w">',
        'partials/card.hbs': '<article class="card">{{title}}</article>'
    };

    it('returns a NEW files object plus the skipped optional edits', function () {
        const {theme: edited, skipped} = applyThemeAttributeEdits(theme, {file: 'index.hbs', line: 1, column: 1}, [
            {name: 'src', value: '/new.jpg'},
            {name: 'srcset', value: null, optional: true}
        ], {tagName: 'img'});
        assert.notEqual(edited, theme);
        assert.equal(edited['index.hbs'], '<img class="hero" src="/new.jpg">');
        assert.deepEqual(skipped, []);
        assert.equal(theme['index.hbs'], '<img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w">', 'input never mutated');
    });

    it('surfaces skipped optional edits through the wrapper', function () {
        const blocked = {'index.hbs': '<img {{#if lazy}}srcset="/s.jpg 300w"{{/if}} src="/old.jpg">'};
        const {theme: edited, skipped} = applyThemeAttributeEdits(blocked, {file: 'index.hbs', line: 1, column: 1}, [
            {name: 'src', value: '/new.jpg'},
            {name: 'srcset', value: null, optional: true}
        ]);
        assert.ok(edited['index.hbs']!.includes('src="/new.jpg"'));
        assert.equal(skipped.length, 1);
        assert.equal(skipped[0]!.name, 'srcset');
    });
});

describe('applyThemeAttributeEdit', function () {
    const theme = {
        'index.hbs': '<img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w">',
        'partials/card.hbs': '<article class="card">{{title}}</article>'
    };

    it('returns a NEW files object with only the marker file edited', function () {
        const edited = applyThemeAttributeEdit(theme, {file: 'index.hbs', line: 1, column: 1}, {name: 'src', value: '/new.jpg'});
        assert.notEqual(edited, theme);
        assert.equal(edited['index.hbs'], '<img class="hero" src="/new.jpg" srcset="/old-s.jpg 300w">');
        assert.equal(edited['partials/card.hbs'], theme['partials/card.hbs']);
        // the input is never mutated
        assert.equal(theme['index.hbs'], '<img class="hero" src="/old.jpg" srcset="/old-s.jpg 300w">');
    });

    it('supports Map-shaped ThemeFiles', function () {
        const map = new Map(Object.entries(theme));
        const edited = applyThemeAttributeEdit(map, {file: 'index.hbs', line: 1, column: 1}, {name: 'srcset', value: null});
        assert.ok(edited instanceof Map);
        assert.equal(edited.get('index.hbs'), '<img class="hero" src="/old.jpg">');
        assert.equal(map.get('index.hbs'), theme['index.hbs']);
    });

    it('passes the anchor through (stale marker fails at theme level too)', function () {
        assert.equal(
            applyThemeAttributeEdit(theme, {file: 'index.hbs', line: 1, column: 1}, {name: 'src', value: '/new.jpg'}, {tagName: 'img'})['index.hbs'],
            '<img class="hero" src="/new.jpg" srcset="/old-s.jpg 300w">'
        );
        assert.throws(
            () => applyThemeAttributeEdit(theme, {file: 'index.hbs', line: 1, column: 1}, {name: 'src', value: '/new.jpg'}, {tagName: 'video'}),
            /stale/
        );
    });

    it('rejects a marker pointing at a file the theme does not contain', function () {
        assert.throws(
            () => applyThemeAttributeEdit(theme, {file: 'partials/missing.hbs', line: 1, column: 1}, {name: 'src', value: 'x'}),
            /partials\/missing\.hbs/
        );
    });
});
