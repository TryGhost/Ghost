import JSZip from 'jszip';
import {
  THEME_EDITOR_ARCHIVE_LIMITS,
  ThemeArchiveExtractionError,
  type ThemeEditorSnapshot,
  cloneThemeFiles,
  createFolderRenameMap,
  extractThemeArchive,
  getThemeChanges,
  isEditablePath,
  parseEditingThemeRoute,
  packThemeArchive,
} from '@/settings/site/theme/theme-editor-utils';

const createArchiveBuffer = async (build: (zip: JSZip) => void) => {
  const zip = new JSZip();

  build(zip);

  return zip.generateAsync({ type: 'arraybuffer' });
};

const uint8ArrayToArray = (value: Uint8Array | null) => Array.from(value ?? []);

describe('theme-editor-utils', function () {
  describe('parseEditingThemeRoute', function () {
    it('decodes valid theme names and ignores unrelated routes', function () {
      expect(parseEditingThemeRoute('theme/edit/my%20theme?from=theme')).toStrictEqual({
        themeName: 'my theme',
        isInvalid: false,
      });
      expect(parseEditingThemeRoute('design/change-theme')).toStrictEqual({
        themeName: null,
        isInvalid: false,
      });
    });

    it('rejects malformed and encoded-slash theme names', function () {
      expect(parseEditingThemeRoute('theme/edit/%E0%A4%A')).toStrictEqual({
        themeName: null,
        isInvalid: true,
      });
      expect(parseEditingThemeRoute('theme/edit/%2Fedition')).toStrictEqual({
        themeName: null,
        isInvalid: true,
      });
    });
  });

  describe('isEditablePath', function () {
    it('treats extension-based theme source files as editable', function () {
      expect(isEditablePath('partials/post-card.hbs')).toBe(true);
      expect(isEditablePath('assets/app.css')).toBe(true);
    });

    it('treats common extensionless text files as editable', function () {
      expect(isEditablePath('.gitignore')).toBe(true);
      expect(isEditablePath('LICENSE')).toBe(true);
      expect(isEditablePath('subdir/.editorconfig')).toBe(true);
    });

    it('keeps binary assets non-editable', function () {
      expect(isEditablePath('assets/logo.png')).toBe(false);
      expect(isEditablePath('assets/font.woff2')).toBe(false);
    });
  });

  describe('extractThemeArchive', function () {
    it('detects and strips a shared root prefix while preserving file contents', async function () {
      const packageJson = JSON.stringify({ name: 'source-edited' }, null, 2);
      const binaryLogo = new Uint8Array([137, 80, 78, 71, 0, 255, 12]);
      const date = new Date('2026-05-03T12:00:00.000Z');
      const archive = await createArchiveBuffer((zip) => {
        zip.file('source-edited/package.json', packageJson, {
          date,
          unixPermissions: 0o644,
        });
        zip.file('source-edited/assets/logo.png', binaryLogo, {
          binary: true,
          date,
          unixPermissions: 0o644,
        });
      });

      const snapshot = await extractThemeArchive(archive);

      expect(snapshot.rootPrefix).toBe('source-edited/');
      expect(Object.keys(snapshot.files).sort()).toStrictEqual(['assets/logo.png', 'package.json']);
      expect(snapshot.files['package.json'].editable).toBe(true);
      expect(snapshot.files['package.json'].content).toBe(packageJson);
      expect(snapshot.files['assets/logo.png'].editable).toBe(false);
      expect(uint8ArrayToArray(snapshot.files['assets/logo.png'].binary)).toStrictEqual(
        Array.from(binaryLogo),
      );
    });

    it('leaves flat archives without a synthetic root prefix', async function () {
      const archive = await createArchiveBuffer((zip) => {
        zip.file('index.hbs', '{{!< default}}');
        zip.file('assets/app.css', 'body { color: red; }');
      });

      const snapshot = await extractThemeArchive(archive);

      expect(snapshot.rootPrefix).toBe('');
      expect(Object.keys(snapshot.files).sort()).toStrictEqual(['assets/app.css', 'index.hbs']);
    });

    it('rejects archives with too many files before extracting them', async function () {
      const archive = await createArchiveBuffer((zip) => {
        for (let index = 0; index <= THEME_EDITOR_ARCHIVE_LIMITS.maxFiles; index += 1) {
          zip.file(`partials/file-${index}.hbs`, `{{! file ${index} }}`);
        }
      });

      const extraction = extractThemeArchive(archive);

      await expect(extraction).rejects.toBeInstanceOf(ThemeArchiveExtractionError);
      await expect(extraction).rejects.toHaveProperty('reason', 'too_many_files');
      await expect(extraction).rejects.toThrow(/too many files/i);
    });

    it('rejects archives whose extracted contents exceed the browser limit', async function () {
      const archive = await createArchiveBuffer((zip) => {
        zip.file(
          'assets/huge.bin',
          new Uint8Array(THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes + 1),
          {
            binary: true,
            compression: 'DEFLATE',
          },
        );
      });

      const extraction = extractThemeArchive(archive);

      await expect(extraction).rejects.toBeInstanceOf(ThemeArchiveExtractionError);
      await expect(extraction).rejects.toHaveProperty('reason', 'too_large');
      await expect(extraction).rejects.toThrow(/too large/i);
    });

    it('rejects archives with non-normalized entry paths', async function () {
      const archive = await createArchiveBuffer((zip) => {
        zip.file('/post-card.hbs', '{{title}}');
      });

      const extraction = extractThemeArchive(archive);

      await expect(extraction).rejects.toBeInstanceOf(ThemeArchiveExtractionError);
      await expect(extraction).rejects.toHaveProperty('reason', 'invalid_archive');
      await expect(extraction).rejects.toThrow(/failed to open the theme archive/i);
    });
  });

  describe('packThemeArchive', function () {
    it('preserves root prefixes, editable text, and binary bytes across a roundtrip', async function () {
      const originalArchive = await createArchiveBuffer((zip) => {
        zip.file('source-edited/index.hbs', '<main>{{title}}</main>', {
          date: new Date('2026-05-03T13:00:00.000Z'),
        });
        zip.file('source-edited/assets/logo.png', new Uint8Array([0, 1, 2, 200, 255]), {
          binary: true,
          date: new Date('2026-05-03T13:00:00.000Z'),
        });
      });

      const extractedSnapshot = await extractThemeArchive(originalArchive);
      const packedArchive = await packThemeArchive(extractedSnapshot);
      const repackedBuffer = await packedArchive.arrayBuffer();
      const rawZip = await JSZip.loadAsync(repackedBuffer);
      const roundTrippedSnapshot = await extractThemeArchive(repackedBuffer);

      expect(
        Object.keys(rawZip.files)
          .filter((path) => !rawZip.files[path].dir)
          .sort(),
      ).toStrictEqual(['source-edited/assets/logo.png', 'source-edited/index.hbs']);
      expect(roundTrippedSnapshot.rootPrefix).toBe('source-edited/');
      expect(roundTrippedSnapshot.files['index.hbs'].content).toBe('<main>{{title}}</main>');
      expect(uint8ArrayToArray(roundTrippedSnapshot.files['assets/logo.png'].binary)).toStrictEqual(
        [0, 1, 2, 200, 255],
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
            dosPermissions: null,
          },
        },
      };

      const packedArchive = await packThemeArchive(snapshot);
      const zip = await JSZip.loadAsync(await packedArchive.arrayBuffer());

      expect(await zip.file('source-edited/index.hbs')?.async('string')).toBe(
        '<main>updated</main>',
      );
    });
  });

  describe('getThemeChanges', function () {
    it('reports sorted added, deleted, and modified text files', function () {
      const date = new Date('2026-05-03T15:00:00.000Z');
      const baseFiles = {
        'assets/logo.png': {
          path: 'assets/logo.png',
          editable: false,
          content: null,
          binary: new Uint8Array([1, 2, 3]),
          date,
          unixPermissions: null,
          dosPermissions: null,
        },
        'index.hbs': {
          path: 'index.hbs',
          editable: true,
          content: '<main>before</main>',
          binary: null,
          date,
          unixPermissions: null,
          dosPermissions: null,
        },
      };
      const currentFiles = {
        'assets/app.css': {
          path: 'assets/app.css',
          editable: true,
          content: 'body { color: green; }',
          binary: null,
          date,
          unixPermissions: null,
          dosPermissions: null,
        },
        'index.hbs': {
          path: 'index.hbs',
          editable: true,
          content: '<main>after</main>',
          binary: null,
          date,
          unixPermissions: null,
          dosPermissions: null,
        },
      };

      expect(getThemeChanges({ baseFiles, currentFiles })).toStrictEqual([
        { path: 'assets/app.css', editable: true, status: 'added' },
        { path: 'assets/logo.png', editable: false, status: 'deleted' },
        { path: 'index.hbs', editable: true, status: 'modified' },
      ]);
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
          dosPermissions: null,
        },
      };

      const clonedFiles = cloneThemeFiles(originalFiles);

      clonedFiles['assets/logo.png'].binary![0] = 99;
      clonedFiles['assets/logo.png'].date.setUTCFullYear(2030);

      expect(uint8ArrayToArray(originalFiles['assets/logo.png'].binary)).toStrictEqual([4, 5, 6]);
      expect(originalFiles['assets/logo.png'].date.getUTCFullYear()).toBe(2026);
    });
  });

  describe('createFolderRenameMap', function () {
    it('renames every file under a folder prefix without touching siblings', function () {
      const date = new Date('2026-05-03T17:00:00.000Z');
      const renamedFiles = createFolderRenameMap({
        files: {
          'assets/app.css': {
            path: 'assets/app.css',
            editable: true,
            content: 'body {}',
            binary: null,
            date,
            unixPermissions: null,
            dosPermissions: null,
          },
          'partials/post-card.hbs': {
            path: 'partials/post-card.hbs',
            editable: true,
            content: '{{title}}',
            binary: null,
            date,
            unixPermissions: null,
            dosPermissions: null,
          },
        },
        oldPrefix: 'assets/',
        newPrefix: 'static/',
      });

      expect(Object.keys(renamedFiles).sort()).toStrictEqual([
        'partials/post-card.hbs',
        'static/app.css',
      ]);
      expect(renamedFiles['static/app.css'].path).toBe('static/app.css');
      expect(renamedFiles['partials/post-card.hbs'].path).toBe('partials/post-card.hbs');
    });
  });
});
