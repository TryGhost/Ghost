// Browser zip round-trip for theme archives (shared by the Admin theme code
// editor and the standalone Admin Builder). Tests moved together with the
// code from apps/admin/src/settings/app/components/settings/site/theme/
// theme-editor-utils.test.ts — same fixtures, same assertions.
import * as assert from 'node:assert/strict';
import JSZip from 'jszip';
import {describe, it} from 'vitest';
import {
    THEME_EDITOR_ARCHIVE_LIMITS,
    ThemeArchiveExtractionError,
    type ThemeEditorSnapshot,
    cloneThemeFiles,
    detectCommonRoot,
    extractThemeArchive,
    getExtension,
    isDefaultThemeName,
    isEditablePath,
    normaliseRelativePath,
    packThemeArchive
} from '../../src/editor/archive.ts';

const createArchiveBuffer = async (build: (zip: JSZip) => void) => {
    const zip = new JSZip();

    build(zip);

    return zip.generateAsync({type: 'arraybuffer'});
};

const uint8ArrayToArray = (value: Uint8Array | null) => Array.from(value ?? []);

describe('editor/archive', function () {
    describe('isEditablePath', function () {
        it('treats extension-based theme source files as editable', function () {
            assert.equal(isEditablePath('partials/post-card.hbs'), true);
            assert.equal(isEditablePath('assets/app.css'), true);
        });

        it('treats common extensionless text files as editable', function () {
            assert.equal(isEditablePath('.gitignore'), true);
            assert.equal(isEditablePath('LICENSE'), true);
            assert.equal(isEditablePath('subdir/.editorconfig'), true);
        });

        it('keeps binary assets non-editable', function () {
            assert.equal(isEditablePath('assets/logo.png'), false);
            assert.equal(isEditablePath('assets/font.woff2'), false);
        });
    });

    describe('isDefaultThemeName', function () {
        it('matches casper and source case-insensitively', function () {
            assert.equal(isDefaultThemeName('casper'), true);
            assert.equal(isDefaultThemeName('Casper'), true);
            assert.equal(isDefaultThemeName('source'), true);
            assert.equal(isDefaultThemeName('SOURCE'), true);
        });

        it('does not match other theme names', function () {
            assert.equal(isDefaultThemeName('casper-edited'), false);
            assert.equal(isDefaultThemeName('my-theme'), false);
            assert.equal(isDefaultThemeName(''), false);
        });
    });

    describe('getExtension', function () {
        it('lower-cases the extension and handles extensionless paths', function () {
            assert.equal(getExtension('index.HBS'), 'hbs');
            assert.equal(getExtension('LICENSE'), '');
        });
    });

    describe('normaliseRelativePath', function () {
        it('strips leading slashes and collapses duplicates', function () {
            assert.equal(normaliseRelativePath('/partials//card.hbs'), 'partials/card.hbs');
        });

        it('rejects traversal segments and empty input', function () {
            assert.equal(normaliseRelativePath('../evil.hbs'), null);
            assert.equal(normaliseRelativePath('  '), null);
        });
    });

    describe('detectCommonRoot', function () {
        it('detects a shared single-segment prefix', function () {
            assert.equal(detectCommonRoot(['casper/index.hbs', 'casper/package.json']), 'casper/');
        });

        it('returns empty for flat or mixed archives', function () {
            assert.equal(detectCommonRoot(['index.hbs', 'casper/package.json']), '');
            assert.equal(detectCommonRoot([]), '');
        });
    });

    describe('extractThemeArchive', function () {
        it('detects and strips a shared root prefix while preserving file contents', async function () {
            const packageJson = JSON.stringify({name: 'source-edited'}, null, 2);
            const binaryLogo = new Uint8Array([137, 80, 78, 71, 0, 255, 12]);
            const date = new Date('2026-05-03T12:00:00.000Z');
            const archive = await createArchiveBuffer((zip) => {
                zip.file('source-edited/package.json', packageJson, {
                    date,
                    unixPermissions: 0o644
                });
                zip.file('source-edited/assets/logo.png', binaryLogo, {
                    binary: true,
                    date,
                    unixPermissions: 0o644
                });
            });

            const snapshot = await extractThemeArchive(archive);

            assert.equal(snapshot.rootPrefix, 'source-edited/');
            assert.deepEqual(Object.keys(snapshot.files).sort(), ['assets/logo.png', 'package.json']);
            assert.equal(snapshot.files['package.json']!.editable, true);
            assert.equal(snapshot.files['package.json']!.content, packageJson);
            assert.equal(snapshot.files['assets/logo.png']!.editable, false);
            assert.deepEqual(uint8ArrayToArray(snapshot.files['assets/logo.png']!.binary), Array.from(binaryLogo));
        });

        it('leaves flat archives without a synthetic root prefix', async function () {
            const archive = await createArchiveBuffer((zip) => {
                zip.file('index.hbs', '{{!< default}}');
                zip.file('assets/app.css', 'body { color: red; }');
            });

            const snapshot = await extractThemeArchive(archive);

            assert.equal(snapshot.rootPrefix, '');
            assert.deepEqual(Object.keys(snapshot.files).sort(), ['assets/app.css', 'index.hbs']);
        });

        it('rejects archives with too many files before extracting them', async function () {
            const archive = await createArchiveBuffer((zip) => {
                for (let index = 0; index <= THEME_EDITOR_ARCHIVE_LIMITS.maxFiles; index += 1) {
                    zip.file(`partials/file-${index}.hbs`, `{{! file ${index} }}`);
                }
            });

            await assert.rejects(
                extractThemeArchive(archive),
                (error: unknown) => {
                    assert.ok(error instanceof ThemeArchiveExtractionError);
                    assert.equal(error.reason, 'too_many_files');
                    assert.match(error.message, /too many files/i);

                    return true;
                }
            );
        });

        it('rejects archives whose extracted contents exceed the browser limit', async function () {
            const archive = await createArchiveBuffer((zip) => {
                zip.file('assets/huge.bin', new Uint8Array(THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes + 1), {
                    binary: true,
                    compression: 'DEFLATE'
                });
            });

            await assert.rejects(
                extractThemeArchive(archive),
                (error: unknown) => {
                    assert.ok(error instanceof ThemeArchiveExtractionError);
                    assert.equal(error.reason, 'too_large');
                    assert.match(error.message, /too large/i);

                    return true;
                }
            );
        });

        it('rejects archives with non-normalized entry paths', async function () {
            const archive = await createArchiveBuffer((zip) => {
                zip.file('/post-card.hbs', '{{title}}');
            });

            await assert.rejects(
                extractThemeArchive(archive),
                (error: unknown) => {
                    assert.ok(error instanceof ThemeArchiveExtractionError);
                    assert.equal(error.reason, 'invalid_archive');
                    assert.match(error.message, /failed to open the theme archive/i);

                    return true;
                }
            );
        });

        it('rejects buffers that are not zip archives at all', async function () {
            await assert.rejects(
                extractThemeArchive(new TextEncoder().encode('not a zip').buffer as ArrayBuffer),
                (error: unknown) => {
                    assert.ok(error instanceof ThemeArchiveExtractionError);
                    assert.equal(error.reason, 'invalid_archive');

                    return true;
                }
            );
        });
    });

    describe('packThemeArchive', function () {
        it('preserves root prefixes, editable text, and binary bytes across a roundtrip', async function () {
            const originalArchive = await createArchiveBuffer((zip) => {
                zip.file('source-edited/index.hbs', '<main>{{title}}</main>', {
                    date: new Date('2026-05-03T13:00:00.000Z')
                });
                zip.file('source-edited/assets/logo.png', new Uint8Array([0, 1, 2, 200, 255]), {
                    binary: true,
                    date: new Date('2026-05-03T13:00:00.000Z')
                });
            });

            const extractedSnapshot = await extractThemeArchive(originalArchive);
            const packedArchive = await packThemeArchive(extractedSnapshot);
            const repackedBuffer = await packedArchive.arrayBuffer();
            const rawZip = await JSZip.loadAsync(repackedBuffer);
            const roundTrippedSnapshot = await extractThemeArchive(repackedBuffer);

            assert.deepEqual(
                Object.keys(rawZip.files).filter(path => !rawZip.files[path]!.dir).sort(),
                ['source-edited/assets/logo.png', 'source-edited/index.hbs']
            );
            assert.equal(roundTrippedSnapshot.rootPrefix, 'source-edited/');
            assert.equal(roundTrippedSnapshot.files['index.hbs']!.content, '<main>{{title}}</main>');
            assert.deepEqual(
                uint8ArrayToArray(roundTrippedSnapshot.files['assets/logo.png']!.binary),
                [0, 1, 2, 200, 255]
            );
        });

        it('writes the current editable content into the archive instead of stale source text', async function () {
            const snapshot: ThemeEditorSnapshot = {
                rootPrefix: 'source-edited/',
                files: {
                    'index.hbs': {
                        path: 'index.hbs',
                        editable: true,
                        content: '<main>updated</main>',
                        binary: null,
                        date: new Date('2026-05-03T14:00:00.000Z'),
                        unixPermissions: null,
                        dosPermissions: null
                    }
                }
            };

            const packedArchive = await packThemeArchive(snapshot);
            const zip = await JSZip.loadAsync(await packedArchive.arrayBuffer());

            assert.equal(await zip.file('source-edited/index.hbs')?.async('string'), '<main>updated</main>');
        });
    });

    describe('cloneThemeFiles', function () {
        it('deep-clones mutable file fields used by revert and save flows', function () {
            const originalDate = new Date('2026-05-03T16:00:00.000Z');
            const originalFiles = {
                'assets/logo.png': {
                    path: 'assets/logo.png',
                    editable: false,
                    content: null,
                    binary: new Uint8Array([4, 5, 6]),
                    date: originalDate,
                    unixPermissions: null,
                    dosPermissions: null
                }
            };

            const clonedFiles = cloneThemeFiles(originalFiles);

            clonedFiles['assets/logo.png']!.binary![0] = 99;
            clonedFiles['assets/logo.png']!.date.setUTCFullYear(2030);

            assert.deepEqual(uint8ArrayToArray(originalFiles['assets/logo.png'].binary), [4, 5, 6]);
            assert.equal(originalFiles['assets/logo.png'].date.getUTCFullYear(), 2026);
        });
    });
});
