// Admin-app-specific theme editor utilities. The archive round-trip suite
// (extract/pack/limits/classification) moved with the code to
// packages/theme-renderer/test/editor/archive.test.ts; the smoke test below
// keeps the re-export wiring honest from this side of the seam.
import * as assert from 'assert/strict';
import JSZip from 'jszip';
import {
  createFolderRenameMap,
  extractThemeArchive,
  getThemeChanges,
  packThemeArchive,
  parseEditingThemeRoute,
} from '@/settings/site/theme/theme-editor-utils';

describe('theme-editor-utils', function () {
  describe('parseEditingThemeRoute', function () {
    it('decodes valid theme names and ignores unrelated routes', function () {
      assert.deepEqual(parseEditingThemeRoute('theme/edit/my%20theme?from=theme'), {
        themeName: 'my theme',
        isInvalid: false,
      });
      assert.deepEqual(parseEditingThemeRoute('design/change-theme'), {
        themeName: null,
        isInvalid: false,
      });
    });

    it('rejects malformed and encoded-slash theme names', function () {
      assert.deepEqual(parseEditingThemeRoute('theme/edit/%E0%A4%A'), {
        themeName: null,
        isInvalid: true,
      });
      assert.deepEqual(parseEditingThemeRoute('theme/edit/%2Fedition'), {
        themeName: null,
        isInvalid: true,
      });
    });
  });

  describe('archive round-trip (re-exported from @tryghost/theme-renderer/editor/archive)', function () {
    it('extracts and repacks a theme archive through the re-exports', async function () {
      const zip = new JSZip();
      zip.file('source-edited/index.hbs', '<main>{{title}}</main>');
      const archive = await zip.generateAsync({ type: 'arraybuffer' });

      const snapshot = await extractThemeArchive(archive);

      assert.equal(snapshot.rootPrefix, 'source-edited/');
      assert.equal(snapshot.files['index.hbs'].content, '<main>{{title}}</main>');

      const packed = await packThemeArchive(snapshot);
      const repacked = await JSZip.loadAsync(await packed.arrayBuffer());

      assert.equal(
        await repacked.file('source-edited/index.hbs')?.async('string'),
        '<main>{{title}}</main>',
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

      assert.deepEqual(getThemeChanges({ baseFiles, currentFiles }), [
        { path: 'assets/app.css', editable: true, status: 'added' },
        { path: 'assets/logo.png', editable: false, status: 'deleted' },
        { path: 'index.hbs', editable: true, status: 'modified' },
      ]);
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

      assert.deepEqual(Object.keys(renamedFiles).sort(), [
        'partials/post-card.hbs',
        'static/app.css',
      ]);
      assert.equal(renamedFiles['static/app.css'].path, 'static/app.css');
      assert.equal(renamedFiles['partials/post-card.hbs'].path, 'partials/post-card.hbs');
    });
  });
});
