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

  it('expires a source saved before its adapter-assigned key reached the manifest', async function () {
    const directoryKey = 'content-csv-import/test-site/interrupted';
    await uploads.create('interrupted', owner, now, {
      key: directoryKey + '/source',
      name: 'posts.csv',
    });
    await storage.save({ name: 'renamed', path: sourcePath }, directoryKey);

    const report = sinon.stub();
    await stager().cleanupExpired(new Date('2026-01-03'), report);

    sinon.assert.notCalled(report);
    assert.deepEqual((await storage.listPrefix(directoryKey)).keys, []);
    assert.equal(await uploads.get('interrupted'), undefined);
  });

  it('looks up and cancels an upload using the stored filename', async function () {
    const save = storage.save.bind(storage);
    sinon
      .stub(storage, 'save')
      .callsFake((file, target) => save({ ...file, name: 'renamed' }, target));
    const adapter = stager();
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.csv', owner },
      'mapped',
      now,
    );
    assert.deepEqual(await adapter.lookup('mapped', owner, now), { status: 'ready', file });
    await adapter.cancel('mapped', owner);
    assert.equal(await fs.pathExists(path.join(directory, file.key)), false);
  });

  it('rejects a manifest referencing a different import during confirmation and cancellation', async function () {
    const adapter = stager();
    const request = { filePath: sourcePath, fileName: 'posts.csv', owner };
    const otherFile = await adapter.stage(request, 'other', now);
    await adapter.stage(request, 'mapped', now);
    await uploads.change('mapped', () => ({ value: undefined, change: { file: otherFile } }));

    await assert.rejects(adapter.lookup('mapped', owner, now), /Invalid CSV upload source/);
    await assert.rejects(adapter.cancel('mapped', owner), /Invalid CSV upload source/);
    assert.equal(await fs.pathExists(path.join(directory, otherFile.key)), true);
  });

  it('claims an owner-bound upload only once and returns the first receipt', async function () {
    const adapter = stager();
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.csv', owner },
      'claim',
      now,
    );
    assert.deepEqual(await adapter.lookup('claim', owner, now), { status: 'ready', file });
    await assert.rejects(adapter.lookup('claim', { ...owner, id: 'different-owner' }, now), {
      errorType: 'NotFoundError',
    });
    assert.equal(await adapter.claim('claim', owner, now, 1), undefined);
    await assert.rejects(adapter.lookup('claim', owner, now), {
      code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    });
    await assert.rejects(adapter.claim('claim', owner, now, 1), {
      code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    });
    await assert.rejects(adapter.cancel('claim', owner), { errorType: 'ConflictError' });
    await adapter.acknowledge('claim');
    assert.equal(await adapter.claim('claim', owner, now, 1), 1);
    assert.deepEqual(await adapter.lookup('claim', owner, now), { status: 'accepted', total: 1 });
    await assert.rejects(adapter.lookup('claim', owner, new Date('2026-01-03')), {
      errorType: 'NotFoundError',
    });
  });

  it('does not dispatch a confirmation that raced with cancellation', async function () {
    const adapter = stager();
    const other = stager(() => new LocalStorageBase({ storagePath: directory }));
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.csv', owner },
      'cancel',
      now,
    );
    const attempted = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const conditionalWrite = storage.writeVersionedMetadata.bind(storage);
    sinon.stub(storage, 'writeVersionedMetadata').callsFake(async (key, bytes, version) => {
      attempted.resolve();
      await resume.promise;
      return conditionalWrite(key, bytes, version);
    });
    const claim = assert.rejects(adapter.claim('cancel', owner, now, 1), {
      errorType: 'NotFoundError',
    });
    try {
      await attempted.promise;
      await other.cancel('cancel', owner);
    } finally {
      resume.resolve();
      await claim;
    }
    await assert.rejects(adapter.download(file), { errorType: 'NotFoundError' });
    assert.equal(await uploads.get('cancel'), undefined);
  });

  it('does not resurrect a source that expired during staging', async function () {
    const adapter = stager();
    const copying = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const save = storage.save.bind(storage);
    sinon.stub(storage, 'save').callsFake(async (file, target) => {
      copying.resolve();
      await resume.promise;
      return save(file, target);
    });
    const stage = assert.rejects(
      adapter.stage({ filePath: sourcePath, fileName: 'posts.csv', owner }, 'expired-copy', now),
      { errorType: 'NotFoundError' },
    );
    try {
      await copying.promise;
      const report = sinon.stub();
      await adapter.cleanupExpired(new Date('2026-01-03'), report);
      sinon.assert.notCalled(report);
    } finally {
      resume.resolve();
      await stage;
    }
    assert.equal(await uploads.get('expired-copy'), undefined);
    assert.deepEqual(await storage.listPrefix('content-csv-import/test-site'), { keys: [] });
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

  it('expires unclaimed and uncertain sources, but protects concurrent acceptance', async function () {
    const adapter = stager();
    const request = { filePath: sourcePath, fileName: 'posts.csv', owner };
    await adapter.stage(request, 'ready', now);
    await adapter.stage(request, 'uncertain', now);
    await adapter.stage(request, 'racing', now);
    await adapter.begin('uncertain', 1);
    await adapter.begin('racing', 1);
    const report = sinon.stub();
    await adapter.cleanupExpired(now, report);
    assert.equal((await storage.listPrefix('content-csv-uploads/test-site')).keys.length, 3);

    const conditionalWrite = storage.writeVersionedMetadata.bind(storage);
    sinon.stub(storage, 'writeVersionedMetadata').callsFake(async (key, bytes, version) => {
      if (key.endsWith('/racing.json') && JSON.parse(bytes.toString()).state === 'deleting') {
        await adapter.acknowledge('racing');
      }
      return conditionalWrite(key, bytes, version);
    });
    await adapter.cleanupExpired(new Date('2026-01-03'), report);
    assert.deepEqual((await storage.listPrefix('content-csv-uploads/test-site')).keys, [
      'content-csv-uploads/test-site/racing.json',
    ]);
    assert.deepEqual((await storage.listPrefix('content-csv-import/test-site')).keys, [
      'content-csv-import/test-site/racing/source',
    ]);
    sinon.assert.notCalled(report);
  });

  it('continues expiry cleanup and retries artifacts after a storage error', async function () {
    const adapter = stager();
    const request = { filePath: sourcePath, fileName: 'posts.csv', owner };
    await adapter.stage(request, 'failed', now);
    await adapter.stage(request, 'next', now);
    const deleteObject = storage.delete.bind(storage);
    const failure = new Error('storage unavailable');
    const deletion = sinon.stub(storage, 'delete').callsFake(deleteObject);
    deletion.onFirstCall().rejects(failure);
    const report = sinon.stub();
    await adapter.cleanupExpired(new Date('2026-01-03'), report);
    assert.equal((await uploads.get('failed'))?.state, 'deleting');
    assert.equal(await uploads.get('next'), undefined);
    sinon.assert.calledOnceWithExactly(report, failure);
    await adapter.cleanupExpired(new Date('2026-01-03'), report);
    assert.deepEqual((await storage.listPrefix('content-csv-uploads/test-site')).keys, []);
  });
});
