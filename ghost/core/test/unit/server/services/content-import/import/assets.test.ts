import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  belongsToAssetDirectory,
  prepareAssetBatch,
  PreparedAssetBatch,
} from '../../../../../../core/server/services/content-import/import/assets';
import type { PostImportRow } from '../../../../../../core/server/services/content-import/import/row';

const ContentFileImporter = require('../../../../../../core/server/data/importer/importers/content-file-importer');

describe('content import assets', function () {
  afterEach(function () {
    sinon.restore();
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
    const save = sinon.stub().resolves('/content/images/unique.jpg');
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
    await batch.store();
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

  it('waits for every asset group to settle before reporting a storage failure', async function () {
    let finishMediaWrite: () => void = () => {};
    const failedWrite = new Error('image storage failed');
    const batch = new PreparedAssetBatch([
      {
        type: 'images',
        files: [],
        importer: {
          type: 'images',
          doImport: async () => {
            throw failedWrite;
          },
          rollback: sinon.stub().resolves(),
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
      {
        type: 'media',
        files: [],
        importer: {
          type: 'media',
          doImport: () =>
            new Promise<[]>((resolve) => {
              finishMediaWrite = () => resolve([]);
            }),
          rollback: sinon.stub().resolves(),
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
    ]);
    let rejected = false;
    const storePromise = batch.store().catch((error) => {
      rejected = true;
      throw error;
    });

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    assert.equal(rejected, false);

    finishMediaWrite();
    await assert.rejects(storePromise, /image storage failed/);
  });

  it('rolls back successful asset groups when another group fails', async function () {
    const failedWrite = new Error('image storage failed');
    const storedMedia = {
      originalPath: 'content/media/movie.mp4',
      newPath: '/content/media/movie.mp4',
      stored: '/content/media/movie.mp4',
    };
    const rollbackMedia = sinon.stub().resolves();
    const batch = new PreparedAssetBatch([
      {
        type: 'images',
        files: [],
        importer: {
          type: 'images',
          doImport: async () => {
            throw failedWrite;
          },
          rollback: sinon.stub().resolves(),
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
      {
        type: 'media',
        files: [],
        importer: {
          type: 'media',
          doImport: async () => [storedMedia],
          rollback: rollbackMedia,
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
    ]);

    await assert.rejects(batch.store(), (error: unknown) => error === failedWrite);
    sinon.assert.calledOnceWithExactly(rollbackMedia, [storedMedia]);
  });

  it('preserves storage and rollback failures when rollback is incomplete', async function () {
    const failedWrite = new Error('image storage failed');
    const failedRollback = new Error('media rollback failed');
    const batch = new PreparedAssetBatch([
      {
        type: 'images',
        files: [],
        importer: {
          type: 'images',
          doImport: async () => {
            throw failedWrite;
          },
          rollback: sinon.stub().resolves(),
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
      {
        type: 'media',
        files: [],
        importer: {
          type: 'media',
          doImport: async () => [],
          rollback: sinon.stub().rejects(failedRollback),
          preProcess: (data: Record<string, unknown>) => data,
        },
      },
    ]);

    await assert.rejects(batch.store(), (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.cause, failedWrite);
      assert.deepEqual(error.errors, [failedWrite, failedRollback]);
      return true;
    });
  });
});
