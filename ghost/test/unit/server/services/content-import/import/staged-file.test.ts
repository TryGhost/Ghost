import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createImportFileStager } from '../../../../../../core/server/services/content-import/import/staged-file';
import { ImportUploadRepository } from '../../../../../../core/server/services/content-import/import/upload-repository';

describe('content import staged file', function () {
  let directory: string;
  let sourcePath: string;
  let storage: LocalStorageBase;
  const owner = { id: 'staff-id', type: 'user' } as const;
  const now = new Date('2026-01-01');
  const uploads = new ImportUploadRepository(
    () => storage,
    () => 'content-csv-uploads/test-site',
  );

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-import-stager-test-'));
    sourcePath = path.join(directory, 'upload');
    await fs.writeFile(sourcePath, 'title\nA staged post\n');
    storage = new LocalStorageBase({
      storagePath: directory,
      staticFileURLPrefix: 'content/imports',
    });
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(directory);
  });

  function stager(getStorage: () => unknown = () => storage) {
    return createImportFileStager({
      downloadToTempFile: async (open) => {
        const downloaded = path.join(directory, 'download');
        await fs.writeFile(downloaded, await text(await open()));
        return { path: downloaded, cleanup: () => fs.remove(downloaded) };
      },
      getStorage,
      namespace: () => 'test-site',
      getDefaultOwner: async () => owner,
    });
  }

  it('opens a staged source by storage key and retains the owner-bound manifest', async function () {
    const adapter = stager();
    const file = await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'first', now);
    assert.deepEqual(file, { key: 'content-csv-import/test-site/first/source', name: 'posts.csv' });
    assert.deepEqual(await uploads.get('first'), {
      file,
      owner_id: owner.id,
      owner_type: owner.type,
      expires_at: new Date('2026-01-02'),
      state: 'ready',
      receipt: null,
    });

    assert.equal((await fs.stat(path.dirname(path.join(directory, file.key)))).mode & 0o777, 0o700);
    await fs.remove(sourcePath);
    const local = await adapter.download(file);
    try {
      assert.equal(await fs.readFile(local.path, 'utf8'), 'title\nA staged post\n');
    } finally {
      await local.cleanup();
    }
    assert.equal(await fs.pathExists(local.path), false);

    await adapter.begin('first', 1);
    await adapter.start('first', now);
    await adapter.remove('first', file);
    await adapter.acknowledge('first'); // dispatch can return after the handler finished
    assert.equal((await uploads.get('first'))?.state, 'finished');
    assert.equal((await uploads.get('first'))?.receipt, '{"total":1}');
    assert.deepEqual(await storage.listPrefix('content-csv-import/test-site'), { keys: [] });
    await assert.rejects(adapter.download(file), { errorType: 'NotFoundError' });
  });

  it('records and removes the source by the key returned by the adapter', async function () {
    const save = storage.save.bind(storage);
    sinon
      .stub(storage, 'save')
      .callsFake((file, target) => save({ ...file, name: 'renamed' }, target));
    const adapter = stager();
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.zip' },
      'renamed',
      now,
    );

    assert.deepEqual(file, {
      key: 'content-csv-import/test-site/renamed/renamed',
      name: 'posts.zip',
    });
    assert.deepEqual((await uploads.get('renamed'))?.file, file);
    await adapter.remove('renamed', file);
    assert.equal(await fs.pathExists(path.join(directory, file.key)), false);
  });

  it('protects acknowledged sources and rejects late uncertain delivery', async function () {
    const adapter = stager();
    const request = { filePath: sourcePath, fileName: 'posts.csv', owner };
    await adapter.stage(request, 'accepted', now);
    await adapter.begin('accepted', 1);
    await adapter.acknowledge('accepted');
    const later = new Date('2026-01-03');
    await adapter.start('accepted', later);
    await adapter.stage(request, 'uncertain', now);
    await adapter.begin('uncertain', 1);
    await assert.rejects(adapter.start('uncertain', later), /no longer available/);
    await assert.rejects(adapter.begin('uncertain', 1), /no longer available/);
  });

  it('removes partial staged artifacts after storage fails', async function () {
    const adapter = stager();
    const save = storage.save.bind(storage);
    sinon.stub(storage, 'save').callsFake(async (file, target) => {
      await save(file, target);
      throw new Error('copy failed');
    });
    await assert.rejects(
      adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'failed', now),
      /copy failed/,
    );
    assert.deepEqual(await storage.listPrefix('content-csv-import/test-site'), { keys: [] });
    assert.equal(await uploads.get('failed'), undefined);
  });

  it('rejects an adapter without durable import operations', async function () {
    await assert.rejects(
      stager(() => ({})).stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'first', now),
      { errorType: 'IncorrectUsageError' },
    );
    assert.deepEqual((await storage.listPrefix('content-csv-uploads/test-site')).keys, []);
  });
});
