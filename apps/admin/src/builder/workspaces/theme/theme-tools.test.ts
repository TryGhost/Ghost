import {describe, expect, it} from 'vitest';

import {
    THEME_TEXT_LIMITS,
    deleteThemeFile,
    editThemeImageAtMarker,
    editThemeTextAtMarker,
    listThemeFiles,
    readThemeFile,
    replaceInThemeFile,
    searchThemeFiles,
    writeThemeFile
} from './theme-tools';
import {withThemeRevision} from './theme-state';

import type {ThemeDraft} from './theme-state';

async function draft(): Promise<ThemeDraft> {
    return withThemeRevision({
        revision: '',
        theme: {name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: 'demo/'},
        files: {
            'assets/logo.png': {path: 'assets/logo.png', kind: 'binary', content: null, binary: new Uint8Array([1, 2, 3]), unixPermissions: null, dosPermissions: null},
            'index.hbs': {path: 'index.hbs', kind: 'text', content: '<main>Welcome</main>\n<p>Welcome home</p>', binary: null, unixPermissions: 0o644, dosPermissions: null},
            'package.json': {path: 'package.json', kind: 'text', content: '{"name":"demo"}', binary: null, unixPermissions: null, dosPermissions: null}
        },
        globalSettings: {accent_color: '#15171A', heading_font: 'Inter', body_font: 'Georgia', icon: null, logo: null, cover_image: null},
        customSettings: {},
        renderer: {siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, missing: []},
        virtualUrl: 'https://example.com/',
        selection: null
    });
}

const onePixelPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2,
    0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1,
    5, 1, 1, 39, 24, 227, 102, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
    96, 130
]);

describe('theme file tools', () => {
    it('rejects edits to authored CSS when the theme renders a compiled stylesheet', async () => {
        const source = await draft();
        source.files['assets/css/screen.css'] = {path: 'assets/css/screen.css', kind: 'text', content: '@IMPORT url(global.css);\n.hero { color: red; }', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['assets/css/global.css'] = {path: 'assets/css/global.css', kind: 'text', content: 'body { color: black; }', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['assets/built/screen.css'] = {path: 'assets/built/screen.css', kind: 'text', content: 'body{color:#000}.hero{color:red}', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['default.hbs'] = {path: 'default.hbs', kind: 'text', content: '<link rel="stylesheet" href="{{asset "built/screen.css"}}">', binary: null, unixPermissions: null, dosPermissions: null};
        const revised = await withThemeRevision(source);

        await expect(replaceInThemeFile(revised, {
            revision: revised.revision,
            path: 'assets/css/screen.css',
            oldText: 'color: red',
            newText: 'color: blue'
        })).resolves.toMatchObject({
            ok: false,
            revision: revised.revision,
            error: {
                code: 'uncompiled_theme_asset',
                retryable: false,
                details: {sourcePath: 'assets/css/screen.css', renderedPaths: ['assets/built/screen.css']}
            }
        });

        await expect(writeThemeFile(revised, {
            revision: revised.revision,
            path: 'assets/css/global.css',
            content: 'body { color: blue; }'
        })).resolves.toMatchObject({
            ok: false,
            error: {
                code: 'uncompiled_theme_asset',
                details: {sourcePath: 'assets/css/global.css', renderedPaths: ['assets/built/screen.css']}
            }
        });
    });

    it('ignores non-rendering and commented template CSS references', async () => {
        const source = await draft();
        source.files['assets/css/screen.css'] = {path: 'assets/css/screen.css', kind: 'text', content: '.hero { color: red; }', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['assets/built/screen.css'] = {path: 'assets/built/screen.css', kind: 'text', content: '.hero{color:red}', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['default.hbs'] = {
            path: 'default.hbs',
            kind: 'text',
            content: '<link rel="stylesheet" href="{{asset "built/screen.css"}}">\n<!-- <link rel="stylesheet" href="{{asset "css/screen.css"}}"> -->\n<a href="/assets/css/screen.css">Download</a>',
            binary: null,
            unixPermissions: null,
            dosPermissions: null
        };
        const revised = await withThemeRevision(source);

        await expect(replaceInThemeFile(revised, {
            revision: revised.revision,
            path: 'assets/css/screen.css',
            oldText: 'color: red',
            newText: 'color: blue'
        })).resolves.toMatchObject({ok: false, error: {code: 'uncompiled_theme_asset'}});
    });

    it('allows CSS edits in the import closure of a rendered stylesheet', async () => {
        const source = await draft();
        source.files['assets/css/global.css'] = {path: 'assets/css/global.css', kind: 'text', content: 'body { color: black; }', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['assets/built/screen.css'] = {path: 'assets/built/screen.css', kind: 'text', content: '@import url(../css/global.css);', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['default.hbs'] = {path: 'default.hbs', kind: 'text', content: '<link rel="stylesheet" href="{{asset "built/screen.css"}}">', binary: null, unixPermissions: null, dosPermissions: null};
        const revised = await withThemeRevision(source);

        await expect(replaceInThemeFile(revised, {
            revision: revised.revision,
            path: 'assets/css/global.css',
            oldText: 'color: black',
            newText: 'color: blue'
        })).resolves.toMatchObject({ok: true, data: {path: 'assets/css/global.css'}});
    });

    it('allows CSS edits when the authored stylesheet is loaded directly', async () => {
        const source = await draft();
        source.files['assets/css/screen.css'] = {path: 'assets/css/screen.css', kind: 'text', content: '.hero { color: red; }', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['assets/built/screen.css'] = {path: 'assets/built/screen.css', kind: 'text', content: '.hero{color:red}', binary: null, unixPermissions: null, dosPermissions: null};
        source.files['default.hbs'] = {path: 'default.hbs', kind: 'text', content: '<link rel="stylesheet" href="{{asset "css/screen.css"}}">', binary: null, unixPermissions: null, dosPermissions: null};
        const revised = await withThemeRevision(source);

        await expect(replaceInThemeFile(revised, {
            revision: revised.revision,
            path: 'assets/css/screen.css',
            oldText: 'color: red',
            newText: 'color: blue'
        })).resolves.toMatchObject({ok: true, data: {path: 'assets/css/screen.css'}});
    });

    it('applies an anchor-verified inline text edit to a new immutable candidate', async () => {
        const source = await draft();
        const result = await editThemeTextAtMarker(source, {
            revision: source.revision,
            marker: 'index.hbs:1:1',
            tagName: 'main',
            newText: 'Edited inline'
        });

        expect(result).toMatchObject({ok: true, data: {path: 'index.hbs', marker: 'index.hbs:1:1'}});
        if (!result.ok) {
            throw new Error('Expected the inline edit to succeed');
        }
        expect(result.candidate.files['index.hbs'].content).toContain('<main>Edited inline</main>');
        expect(result.candidate.revision).not.toBe(source.revision);
        expect(source.files['index.hbs'].content).toContain('<main>Welcome</main>');
    });

    it('rejects stale, unparseable, and mismatched inline text markers', async () => {
        const source = await draft();

        await expect(editThemeTextAtMarker(source, {revision: 'stale', marker: 'index.hbs:1:1', tagName: 'main', newText: 'No'})).resolves.toMatchObject({ok: false, error: {code: 'stale_revision'}});
        await expect(editThemeTextAtMarker(source, {revision: source.revision, marker: 'not-a-marker', tagName: 'main', newText: 'No'})).resolves.toMatchObject({ok: false, error: {code: 'invalid_source_marker'}});
        await expect(editThemeTextAtMarker(source, {revision: source.revision, marker: 'index.hbs:1:1', tagName: 'section', newText: 'No'})).resolves.toMatchObject({ok: false, error: {code: 'inline_edit_unavailable'}});
    });

    it('adds a bounded image asset and anchor-edits src while clearing responsive sources', async () => {
        const source = await draft();
        source.files['index.hbs'].content = '<img src="/old.png" srcset="/old-2x.png 2x" sizes="100vw">';
        const revised = await withThemeRevision(source);

        const result = await editThemeImageAtMarker(revised, {
            revision: revised.revision,
            marker: 'index.hbs:1:1',
            tagName: 'img',
            fileName: 'new hero.png',
            mediaType: 'image/png',
            data: onePixelPng
        });

        expect(result).toMatchObject({ok: true, data: {path: 'index.hbs', assetPath: 'assets/images/builder/new-hero.png'}});
        if (!result.ok) {
            throw new Error('Expected the inline image edit to succeed');
        }
        expect(result.candidate.files['index.hbs'].content).toBe('<img src="{{asset "images/builder/new-hero.png"}}">');
        expect(Array.from(result.candidate.files['assets/images/builder/new-hero.png'].binary ?? []).slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    });

    it('rejects unsupported or oversized inline image data', async () => {
        const source = await draft();

        await expect(editThemeImageAtMarker(source, {
            revision: source.revision,
            marker: 'index.hbs:1:1',
            tagName: 'img',
            fileName: 'payload.svg',
            mediaType: 'image/svg+xml',
            data: new Uint8Array([1])
        })).resolves.toMatchObject({ok: false, error: {code: 'invalid_inline_image'}});
    });

    it('lists normalized files with stable text/binary metadata', async () => {
        const source = await draft();

        expect(listThemeFiles(source)).toEqual({
            ok: true,
            revision: source.revision,
            data: {files: [
                {path: 'assets/logo.png', kind: 'binary', sizeBytes: 3},
                {path: 'index.hbs', kind: 'text', sizeBytes: 40},
                {path: 'package.json', kind: 'text', sizeBytes: 15}
            ]}
        });
    });

    it('searches literal and regular-expression queries with bounded line matches', async () => {
        const source = await draft();

        expect(searchThemeFiles(source, {query: 'Welcome'})).toMatchObject({
            ok: true,
            data: {matches: [
                {path: 'index.hbs', line: 1, column: 7, text: '<main>Welcome</main>'},
                {path: 'index.hbs', line: 2, column: 4, text: '<p>Welcome home</p>'}
            ], truncated: false}
        });
        expect(searchThemeFiles(source, {query: 'Welcome\\s+home', regex: true})).toMatchObject({
            ok: true,
            data: {matches: [{path: 'index.hbs', line: 2, column: 4}]}
        });
        expect(searchThemeFiles(source, {query: '[', regex: true})).toMatchObject({ok: false, error: {code: 'invalid_search_pattern'}});
    });

    it('reads bounded text ranges with line numbers and rejects binary reads', async () => {
        const source = await draft();

        expect(readThemeFile(source, {path: 'index.hbs', startLine: 2, endLine: 2})).toMatchObject({
            ok: true,
            data: {path: 'index.hbs', startLine: 2, startColumn: 1, endLine: 2, totalLines: 2, content: '2: <p>Welcome home</p>', truncated: false, next: null}
        });
        expect(readThemeFile(source, {path: 'assets/logo.png'})).toMatchObject({ok: false, error: {code: 'binary_file'}});
    });

    it('bounds a single long line and returns a resumable cursor', async () => {
        const source = await draft();
        source.files['index.hbs'].content = 'x'.repeat(THEME_TEXT_LIMITS.maxReadCharacters * 2);
        const revised = await withThemeRevision(source);

        const first = readThemeFile(revised, {path: 'index.hbs'});

        expect(first).toMatchObject({ok: true, data: {truncated: true, next: {line: 1}}});
        if (!first.ok || !first.data.next) {
            throw new Error('Expected a resumable read');
        }
        expect(first.data.next.column).toBeGreaterThan(1);
        expect(first.data.content.length).toBeLessThanOrEqual(THEME_TEXT_LIMITS.maxReadCharacters);
        expect(readThemeFile(revised, {path: 'index.hbs', startLine: first.data.next.line, startColumn: first.data.next.column})).toMatchObject({ok: true});
    });

    it('returns a cursor when an explicit line range exceeds the read limit', async () => {
        const source = await draft();
        source.files['index.hbs'].content = Array.from({length: THEME_TEXT_LIMITS.maxReadLines + 2}, (_, index) => `line ${index + 1}`).join('\n');
        const revised = await withThemeRevision(source);

        const result = readThemeFile(revised, {path: 'index.hbs', startLine: 1, endLine: THEME_TEXT_LIMITS.maxReadLines + 2});

        expect(result).toMatchObject({ok: true, data: {endLine: THEME_TEXT_LIMITS.maxReadLines, truncated: true, next: {line: THEME_TEXT_LIMITS.maxReadLines + 1, column: 1}}});
    });

    it('rejects regex shapes that can cause catastrophic backtracking', async () => {
        const source = await draft();

        expect(searchThemeFiles(source, {query: '(a+)+$', regex: true})).toMatchObject({ok: false, error: {code: 'unsafe_search_pattern'}});
        expect(searchThemeFiles(source, {query: `${'a?'.repeat(5)}b`, regex: true})).toMatchObject({ok: false, error: {code: 'unsafe_search_pattern'}});
    });

    it.each(['../index.hbs', '/index.hbs', 'C:/index.hbs', 'partials/../../index.hbs', 'bad\\path.hbs', 'bad\0path.hbs'])(
        'rejects unsafe mutation path %s',
        async (path) => {
            const source = await draft();
            const result = await writeThemeFile(source, {revision: source.revision, path, content: 'unsafe'});

            expect(result).toMatchObject({ok: false, revision: source.revision, error: {code: 'unsafe_path'}});
        }
    );

    it('replaces one exact occurrence in a new immutable candidate', async () => {
        const source = await draft();
        const result = await replaceInThemeFile(source, {revision: source.revision, path: 'index.hbs', oldText: 'Welcome home', newText: 'Hello'});

        expect(result).toMatchObject({ok: true, data: {path: 'index.hbs', replacements: 1}});
        if (!result.ok) {
            throw new Error('Expected replacement to succeed');
        }
        expect(result.candidate.files['index.hbs'].content).toContain('<p>Hello</p>');
        expect(result.candidate.revision).not.toBe(source.revision);
        expect(source.files['index.hbs'].content).toContain('Welcome home');
    });

    it.each([
        {oldText: 'Missing', code: 'replacement_not_found'},
        {oldText: 'Welcome', code: 'replacement_ambiguous'}
    ])('rejects $code replacement', async ({oldText, code}) => {
        const source = await draft();
        const result = await replaceInThemeFile(source, {revision: source.revision, path: 'index.hbs', oldText, newText: 'Hello'});

        expect(result).toMatchObject({ok: false, error: {code}});
    });

    it('rejects stale mutations and binary writes', async () => {
        const source = await draft();

        await expect(writeThemeFile(source, {revision: 'theme-stale', path: 'new.hbs', content: 'new'})).resolves.toMatchObject({ok: false, error: {code: 'stale_revision'}});
        await expect(writeThemeFile(source, {revision: source.revision, path: 'assets/logo.png', content: 'not an image'})).resolves.toMatchObject({ok: false, error: {code: 'binary_file'}});
        await expect(writeThemeFile(source, {revision: source.revision, path: 'assets/new.png', content: 'not an image'})).resolves.toMatchObject({ok: false, error: {code: 'binary_file'}});
        await expect(deleteThemeFile(source, {revision: source.revision, path: 'constructor'})).resolves.toMatchObject({ok: false, error: {code: 'file_not_found'}});
    });

    it('creates and replaces text files while preserving file metadata', async () => {
        const source = await draft();
        const created = await writeThemeFile(source, {revision: source.revision, path: 'partials/card.hbs', content: '<article />'});
        expect(created).toMatchObject({ok: true, data: {path: 'partials/card.hbs', created: true}});
        if (!created.ok) {
            throw new Error('Expected create to succeed');
        }

        const replaced = await writeThemeFile(created.candidate, {revision: created.revision, path: 'index.hbs', content: '<main>Changed</main>'});
        expect(replaced).toMatchObject({ok: true, data: {path: 'index.hbs', created: false}});
        if (!replaced.ok) {
            throw new Error('Expected write to succeed');
        }
        expect(replaced.candidate.files['index.hbs'].unixPermissions).toBe(0o644);
    });

    it('enforces per-file and total text size limits', async () => {
        const source = await draft();
        await expect(writeThemeFile(source, {
            revision: source.revision,
            path: 'huge.css',
            content: 'x'.repeat(THEME_TEXT_LIMITS.maxFileBytes + 1)
        })).resolves.toMatchObject({ok: false, error: {code: 'file_too_large'}});

        const nearLimit = structuredClone(source);
        nearLimit.files['existing.txt'] = {
            path: 'existing.txt',
            kind: 'text',
            content: 'x'.repeat(THEME_TEXT_LIMITS.maxTotalBytes - 1),
            binary: null,
            unixPermissions: null,
            dosPermissions: null
        };
        const revised = await withThemeRevision(nearLimit);
        await expect(writeThemeFile(revised, {revision: revised.revision, path: 'extra.txt', content: 'xx'})).resolves.toMatchObject({ok: false, error: {code: 'theme_text_too_large'}});
    });

    it('deletes a file from a new candidate and reports missing files', async () => {
        const source = await draft();
        const deleted = await deleteThemeFile(source, {revision: source.revision, path: 'index.hbs'});

        expect(deleted).toMatchObject({ok: true, data: {path: 'index.hbs', deleted: true}});
        if (!deleted.ok) {
            throw new Error('Expected delete to succeed');
        }
        expect(deleted.candidate.files['index.hbs']).toBeUndefined();
        await expect(deleteThemeFile(source, {revision: source.revision, path: 'missing.hbs'})).resolves.toMatchObject({ok: false, error: {code: 'file_not_found'}});
    });
});
