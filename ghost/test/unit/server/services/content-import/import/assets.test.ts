import assert from 'node:assert/strict';
import sinon from 'sinon';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { openAssetJournal } from '../../../../../../core/server/services/content-import/import/asset-journal';
import {
  belongsToAssetDirectory,
  prepareAssetBatch,
  PreparedAssetBatch,
} from '../../../../../../core/server/services/content-import/import/assets';
import type { PostImportRow } from '../../../../../../core/server/services/content-import/import/row';

const ContentFileImporter = require('../../../../../../core/server/data/importer/importers/content-file-importer');

describe('content import assets', function () {
  let directory: string;
  let storage: LocalStorageBase;
  beforeEach(async function () {
    directory = await mkdtemp(path.join(os.tmpdir(), 'csv-asset-journal-'));
    storage = new LocalStorageBase({ storagePath: directory });
  });

  afterEach(async function () {
    sinon.restore();
    await rm(directory, { recursive: true, force: true });
  });

  it('recognizes top-level, content, and wrapper asset directories', function () {
    assert.equal(belongsToAssetDirectory('images/photo.jpg', 'images'), true);
    assert.equal(belongsToAssetDirectory('content/images/photo.jpg', 'images'), true);
    assert.equal(
      belongsToAssetDirectory('export/content/images/photo.jpg', 'images', 'export'),
      true,
    );
    assert.equal(belongsToAssetDirectory('export/media/movie.mp4', 'media', 'export'), true);
    assert.equal(
      belongsToAssetDirectory('export/content/files/guide.pdf', 'files', 'export'),
      true,
    );
    assert.equal(belongsToAssetDirectory('photo.jpg', 'images'), false);
    assert.equal(belongsToAssetDirectory('content/files/photo.jpg', 'images'), false);
  });

  it('prepares, stores, and rewrites assets with the existing content-file importer', async function () {
    const save = sinon.stub().resolves('/blog/content/images/unique.jpg');
    const handler = {
      type: 'images' as const,
      extensions: ['.jpg'],
      loadFile: sinon.stub().callsFake(async (files: Array<{ name: string; path: string }>) =>
        files.map((file) => ({
          ...file,
          name: 'unique.jpg',
          originalPath: 'content/images/original.jpg',
          newPath: '/blog/content/images/unique.jpg',
          targetDir: '/var/lib/ghost/content/images',
        })),
      ),
    };
    const importer = new ContentFileImporter({ type: 'images', store: { save } });
    const archive = {
      getFiles: sinon.stub().returns([
        {
          name: 'export/content/images/original.jpg',
          path: '/tmp/export/content/images/original.jpg',
        },
        {
          name: 'export/content/files/not-an-image.jpg',
          path: '/tmp/export/content/files/not-an-image.jpg',
        },
      ]),
    };

    const batch = await prepareAssetBatch(archive, '/tmp/export', 'export', {
      handlers: [handler],
      importers: [importer],
    });

    assert.ok(batch);
    assert.equal(batch.files.length, 1);
    assert.equal(batch.files[0].newPath, '/blog/content/images/unique.jpg');
    await batch.store(await openAssetJournal(storage), async () => {});
    sinon.assert.calledOnceWithExactly(
      save,
      sinon.match({ name: 'unique.jpg', originalPath: 'content/images/original.jpg' }),
      '/var/lib/ghost/content/images',
    );

    const rows: PostImportRow[] = [
      {
        title: 'Assets',
        html: '<img src="/content/images/original.jpg">',
        markdown: '![Image](content/images/original.jpg)',
        feature_image: '/content/images/original.jpg',
        og_image: 'content/images/original.jpg',
        twitter_image: '/content/images/original.jpg',
      },
    ];
    batch.rewriteRows(rows);

    assert.match(rows[0].html, /\/blog\/content\/images\/unique\.jpg/);
    assert.match(rows[0].markdown, /\/blog\/content\/images\/unique\.jpg/);
    assert.equal(rows[0].feature_image, '/blog/content/images/unique.jpg');
    assert.equal(rows[0].og_image, '/blog/content/images/unique.jpg');
    assert.equal(rows[0].twitter_image, '/blog/content/images/unique.jpg');
  });

  it('returns no batch when the archive has no supported asset directories', async function () {
    const loadFile = sinon.stub();
    const batch = await prepareAssetBatch(
      { getFiles: () => [{ name: 'root.jpg', path: '/tmp/root.jpg' }] },
      '/tmp',
      undefined,
      {
        handlers: [{ type: 'images', extensions: ['.jpg'], loadFile }],
        importers: [],
      },
    );

    assert.equal(batch, undefined);
    sinon.assert.notCalled(loadFile);
  });

  it('uses committed storage URLs on redelivery and skips the storage call', async function () {
    const stored = {
      originalPath: 'content/media/movie.mp4',
      newPath: '/content/media/movie.mp4',
      stored: '/content/media/movie-1.mp4',
    };
    const file = { ...stored, name: 'movie.mp4', path: '/tmp/movie.mp4', targetDir: '.' };
    const save = sinon.stub().resolves([stored]);
    const importer = {
      type: 'media' as const,
      doImport: save,
      rollback: sinon.stub().resolves(),
      preProcess: (data: Record<string, unknown>) => data,
    };

    const initial = new PreparedAssetBatch([{ type: 'media', files: [{ ...file }], importer }]);
    await initial.store(await openAssetJournal(storage), async () => {});

    const replay = new PreparedAssetBatch([
      { type: 'media', files: [{ ...file, newPath: '/other.mp4' }], importer },
    ]);
    await replay.store(await openAssetJournal(storage), async () => {});
    sinon.assert.calledOnce(save);
    assert.equal(replay.files[0].newPath, stored.stored);
    assert.equal(replay.isStoredUrl(stored.stored), true);
    assert.equal(replay.isStoredUrl(stored.newPath), false);
  });

  it.each([false, true])(
    'records the terminal failure before rollback (rollback fails: %s)',
    async function (rollbackFails) {
      const failedWrite = new Error('file storage failed');
      const failedRollback = new Error('media rollback failed');
      const stored = {
        originalPath: 'content/media/movie.mp4',
        newPath: '/content/media/movie.mp4',
        stored: '/content/media/movie.mp4',
      };
      const media = { ...stored, name: 'movie.mp4', path: '/tmp/movie.mp4', targetDir: '.' };
      const file = { ...media, name: 'file.pdf', originalPath: 'content/files/file.pdf' };
      const rollback = sinon.stub().callsFake(async () => {
        await assert.rejects(openAssetJournal(storage), /file storage failed/);
        if (rollbackFails) {
          throw failedRollback;
        }
      });
      const batch = new PreparedAssetBatch([
        {
          type: 'media',
          files: [media],
          importer: {
            type: 'media',
            doImport: async () => [stored],
            rollback,
            preProcess: (data: Record<string, unknown>) => data,
          },
        },
        {
          type: 'files',
          files: [file],
          importer: {
            type: 'files',
            doImport: async () => {
              throw failedWrite;
            },
            rollback: sinon.stub().resolves(),
            preProcess: (data: Record<string, unknown>) => data,
          },
        },
      ]);

      const journal = await openAssetJournal(storage);
      await assert.rejects(
        batch.store(journal, async () => {}),
        (error: unknown) => {
          if (rollbackFails) {
            assert.ok(error instanceof AggregateError);
            assert.equal(error.cause, failedWrite);
            assert.deepEqual(error.errors, [failedWrite, failedRollback]);
          } else {
            assert.equal(error, failedWrite);
          }
          return true;
        },
      );
      sinon.assert.calledOnceWithExactly(rollback, [stored]);
    },
  );
});
