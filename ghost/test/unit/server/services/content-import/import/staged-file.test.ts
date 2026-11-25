import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, NotFound, type S3Client } from '@aws-sdk/client-s3';
import S3Storage from '../../../../../../core/server/adapters/storage/S3Storage';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createImportFileStager } from '../../../../../../core/server/services/content-import/import/staged-file';
import { ImportJournal } from '../../../../../../core/server/services/content-import/import/journal';
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

  it('uses private S3 marker objects, scopes them by site, and closes their response streams', async function () {
    const send = sinon.stub().resolves({});
    const s3 = new S3Storage({
      staticFileURLPrefix: 'content/imports',
      bucket: 'private-imports',
      region: 'us-east-1',
      cdnUrl: 'https://cdn.example.com',
      multipartUploadThresholdBytes: 10 * 1024 * 1024,
      multipartChunkSizeBytes: 10 * 1024 * 1024,
      tenantPrefix: 'tenant-a',
      s3Client: { send } as unknown as S3Client,
    });
    const adapter = stager(() => s3);
    const key = 'content-csv-import/test-site/run/cancel-import-run';
    await s3.replaceMetadata(key, Buffer.alloc(0));
    const put = send.firstCall.args[0];
    assert.ok(put instanceof PutObjectCommand);
    assert.ok(Buffer.isBuffer(put.input.Body));
    assert.ok(put.input.Key);
    assert.equal(put.input.Body.length, 0);
    assert.match(put.input.Key, /tenant-a\//);
    assert.ok(put.input.Key.endsWith(key));
    const body = Readable.from(['contents are irrelevant']);
    send.resolves({ Body: body });
    assert.equal(await adapter.cancellationRequested('run'), true);
    const get = send.lastCall.args[0];
    assert.ok(get instanceof GetObjectCommand);
    assert.equal(get.input.Key, put.input.Key);
    assert.equal(body.destroyed, true);
    send.rejects(new NotFound({ $metadata: { httpStatusCode: 404 }, message: 'Missing' }));
    assert.equal(await adapter.cancellationRequested('other-run'), false);
    assert.notEqual(send.lastCall.args[0].input.Key, put.input.Key);
  });

  it('allows finalization to win a race with a late cancellation request', async function () {
    const adapter = stager();
    await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'race', now);
    await adapter.begin('race');
    await adapter.acknowledge('race');
    const replace = storage.replaceMetadata.bind(storage);
    sinon.stub(storage, 'replaceMetadata').callsFake(async (key, bytes) => {
      await adapter.finalizeProgress('race', 'complete');
      await adapter.finishProgress('race');
      return replace(key, bytes);
    });
    assert.equal(await adapter.cancelImport('race', owner, now), 'cancelling');
    assert.equal((await adapter.progress('race', owner, now)).status, 'complete');
    await assert.rejects(adapter.cancelImport('race', owner, now), { errorType: 'ConflictError' });
  });

  it('shares an extension-less cancellation marker across instances and retains it until expiry', async function () {
    const adapter = stager();
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.csv', total: 10 },
      'stop',
      now,
    );
    await adapter.begin('stop');
    await adapter.acknowledge('stop');
    assert.equal(await adapter.cancellationRequested('stop'), false);
    assert.equal(await adapter.cancelImport('stop', owner, now), 'cancelling');
    assert.equal(await adapter.cancelImport('stop', owner, now), 'cancelling');
    const marker = path.join(directory, 'content-csv-import/test-site/stop/cancel-import-stop');
    assert.equal((await fs.stat(marker)).size, 0);
    assert.equal(await stager().cancellationRequested('stop'), true);
    assert.equal((await stager().progress('stop', owner, now)).status, 'cancelling');
    await adapter.start('stop', now);
    const journal = new ImportJournal(adapter.artifacts('stop'), [], { record: 0, part: 0 });
    await journal.append({ line: 2, title: 'Kept', status: 'created' });
    await journal.flush();
    await adapter.finalizeProgress('stop', 'cancelled');
    assert.equal(await adapter.cancelImport('stop', owner, now), 'cancelling');
    assert.deepEqual(await adapter.progress('stop', owner, now), {
      status: 'cancelling',
      processed: 1,
      total: 10,
    });
    await adapter.claimEmail('stop');
    assert.equal(await stager().start('stop', now), false);
    await adapter.finishProgress('stop');
    await adapter.clearArtifacts('stop');
    await adapter.remove('stop', file);
    assert.deepEqual(await adapter.progress('stop', owner, now), {
      status: 'cancelled',
      processed: 1,
      total: 10,
    });
    assert.equal(await adapter.cancelImport('stop', owner, now), 'cancelled');
    assert.equal(await stager().start('stop', now), false);
    assert.equal(await adapter.cancellationRequested('stop'), true);
    await adapter.cleanupExpired(new Date('2026-01-03'), (error) => {
      throw error;
    });
    assert.equal(await adapter.cancellationRequested('stop'), false);
  });

  it('rejects cancellation for other owners, unconfirmed, finalizing, finished and expired imports', async function () {
    const adapter = stager();
    const file = await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'stop', now);
    await assert.rejects(adapter.cancelImport('stop', owner, now), { errorType: 'NotFoundError' });
    await adapter.begin('stop');
    await adapter.acknowledge('stop');
    for (const other of [
      { ...owner, id: 'another' },
      { ...owner, type: 'integration' as const },
    ]) {
      await assert.rejects(adapter.cancelImport('stop', other, now), {
        errorType: 'NotFoundError',
      });
    }
    await adapter.start('stop', now);
    await adapter.finalizeProgress('stop', 'complete');
    await assert.rejects(adapter.cancelImport('stop', owner, now), { errorType: 'ConflictError' });
    await adapter.finishProgress('stop');
    await adapter.remove('stop', file);
    await assert.rejects(adapter.cancelImport('stop', owner, now), { errorType: 'ConflictError' });
    await assert.rejects(adapter.cancelImport('stop', owner, new Date('2026-01-03')), {
      errorType: 'NotFoundError',
    });
    assert.equal(await adapter.cancellationRequested('stop'), false);
  });

  it('does not interpret storage read/write failures as missing markers or acknowledged cancellation', async function () {
    const adapter = stager();
    await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'stop', now);
    await adapter.begin('stop');
    await adapter.acknowledge('stop');
    const error = new Error('Storage offline');
    sinon.stub(storage, 'replaceMetadata').rejects(error);
    await assert.rejects(adapter.cancelImport('stop', owner, now), (failure) => failure === error);
    sinon.stub(storage, 'readStream').rejects(error);
    await assert.rejects(adapter.cancellationRequested('stop'), (failure) => failure === error);
  });

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
      progress: { status: 'queued', processed: 0, total: null },
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

    await adapter.begin('first');
    await adapter.start('first', now);
    await adapter.remove('first', file);
    await adapter.acknowledge('first'); // dispatch can return after the handler finished
    assert.equal((await uploads.get('first'))?.state, 'finished');
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

  it('reports committed rows of every outcome and retains final progress after cleanup', async function () {
    const adapter = stager();
    const file = await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.zip', total: 4 },
      'progress',
      now,
    );
    await adapter.begin('progress');
    await adapter.acknowledge('progress');
    assert.deepEqual(await adapter.progress('progress', owner, now), {
      status: 'queued',
      processed: 0,
      total: 4,
    });
    await adapter.start('progress', now);
    const journal = new ImportJournal(adapter.artifacts('progress'), [], { record: 0, part: 0 });
    for (const status of ['created', 'updated', 'skipped', 'failed'] as const) {
      await journal.append({ line: 2, title: 'Example', status });
    }
    assert.equal((await adapter.progress('progress', owner, now)).processed, 0);
    await journal.flush();
    assert.deepEqual(await stager().progress('progress', owner, now), {
      status: 'running',
      processed: 4,
      total: 4,
    });
    await adapter.finalizeProgress('progress', 'complete');
    assert.deepEqual(await adapter.progress('progress', owner, now), {
      status: 'finalizing',
      processed: 4,
      total: 4,
    });
    await adapter.claimEmail('progress');
    assert.equal(await stager().start('progress', now), false);
    await adapter.finishProgress('progress');
    await adapter.clearArtifacts('progress');
    await adapter.remove('progress', file);
    assert.deepEqual(await stager().progress('progress', owner, now), {
      status: 'complete',
      processed: 4,
      total: 4,
    });
    const later = new Date('2026-01-03');
    await assert.rejects(adapter.progress('progress', owner, later), {
      errorType: 'NotFoundError',
    });
    await adapter.cleanupExpired(later, (error) => {
      throw error;
    });
    assert.equal(await uploads.get('progress'), undefined);
  });

  it.each(['complete', 'failed', 'cancelled'] as const)(
    'keeps an unknown direct-upload total until the full source finishes (%s)',
    async function (outcome) {
      const adapter = stager();
      await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'direct', now);
      await adapter.begin('direct');
      await adapter.start('direct', now);
      assert.deepEqual(await adapter.progress('direct', owner, now), {
        status: 'running',
        processed: 0,
        total: null,
      });
      const journal = new ImportJournal(adapter.artifacts('direct'), [], { record: 0, part: 0 });
      await journal.append({ line: 2, title: 'Example', status: 'created' });
      await journal.flush();
      await adapter.finalizeProgress('direct', outcome);
      await adapter.finishProgress('direct');
      assert.deepEqual(await adapter.progress('direct', owner, now), {
        status: outcome,
        processed: 1,
        total: outcome === 'complete' ? 1 : null,
      });
    },
  );

  it('preserves the full inspected total when a run fails partway through', async function () {
    const adapter = stager();
    await adapter.stage(
      { filePath: sourcePath, fileName: 'posts.csv', total: 100 },
      'partial',
      now,
    );
    await adapter.begin('partial');
    await adapter.start('partial', now);
    await adapter.finalizeProgress('partial', 'failed');
    await adapter.finishProgress('partial');
    assert.deepEqual(await adapter.progress('partial', owner, now), {
      status: 'failed',
      processed: 0,
      total: 100,
    });
  });

  it('protects progress by owner and tenant and hides unsubmitted or missing uploads', async function () {
    const adapter = stager();
    await assert.rejects(adapter.progress('missing', owner, now), { errorType: 'NotFoundError' });
    await adapter.finalizeProgress('missing', 'failed');
    await adapter.finishProgress('missing');
    assert.equal(await uploads.get('missing'), undefined);
    await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'private', now);
    await assert.rejects(adapter.progress('private', owner, now), { errorType: 'NotFoundError' });
    await adapter.begin('private');
    await assert.rejects(adapter.progress('private', owner, now), { errorType: 'NotFoundError' });
    await adapter.acknowledge('private');
    for (const foreign of [
      { ...owner, id: 'other' },
      { ...owner, type: 'integration' as const },
    ]) {
      await assert.rejects(adapter.progress('private', foreign, now), {
        errorType: 'NotFoundError',
      });
    }
    const otherSite = createImportFileStager({
      downloadToTempFile: sinon.stub(),
      getStorage: () => storage,
      namespace: () => 'other-site',
      getDefaultOwner: async () => owner,
    });
    await assert.rejects(otherSite.progress('private', owner, now), { errorType: 'NotFoundError' });
    assert.equal(
      (await adapter.progress('private', owner, new Date('2026-01-03'))).status,
      'queued',
    );
    await uploads.change('private', () => ({ value: undefined, change: { progress: undefined } }));
    await assert.rejects(adapter.progress('private', owner, now), { errorType: 'NotFoundError' });
    await adapter.start('private', now); // Older queued jobs gain progress on first delivery.
    assert.deepEqual(await adapter.progress('private', owner, now), {
      status: 'running',
      processed: 0,
      total: null,
    });
  });

  it.each([false, true])(
    'keeps the final count when cleanup races with checkpoint reading (missing marker: %s)',
    async function (markerMissing) {
      const adapter = stager();
      await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv', total: 1 }, 'race', now);
      await adapter.begin('race');
      await adapter.start('race', now);
      const journal = new ImportJournal(adapter.artifacts('race'), [], { record: 0, part: 0 });
      await journal.append({ line: 2, title: 'Example', status: 'created' });
      await journal.flush();
      const readStream = storage.readStream.bind(storage);
      const read = sinon.stub(storage, 'readStream').callsFake(async (options) => {
        assert.ok(options?.path);
        if (options.path.endsWith(markerMissing ? 'commits/1.txt' : 'checkpoint.txt')) {
          read.restore();
          await adapter.finalizeProgress('race', 'complete');
          await adapter.finishProgress('race');
          await adapter.clearArtifacts('race');
        }
        return readStream(options);
      });
      assert.deepEqual(await adapter.progress('race', owner, now), {
        status: 'complete',
        processed: 1,
        total: 1,
      });
    },
  );

  it('surfaces checkpoint failures while running and rechecks ownership after reading', async function () {
    const adapter = stager();
    await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv' }, 'broken', now);
    await adapter.begin('broken');
    await adapter.start('broken', now);
    await adapter.artifacts('broken').replaceMetadata('checkpoint.txt', Buffer.from('invalid'));
    await assert.rejects(adapter.progress('broken', owner, now), /Invalid CSV import checkpoint/);
    sinon.stub(storage, 'readStream').callsFake(async () => {
      await uploads.remove('broken');
      throw new Error('read failed');
    });
    await assert.rejects(adapter.progress('broken', owner, now), { errorType: 'NotFoundError' });
  });

  it('protects acknowledged sources and rejects late uncertain delivery', async function () {
    const adapter = stager();
    const request = { filePath: sourcePath, fileName: 'posts.csv', owner };
    await adapter.stage(request, 'accepted', now);
    await adapter.begin('accepted');
    await adapter.acknowledge('accepted');
    const later = new Date('2026-01-03');
    await adapter.start('accepted', later);
    await adapter.stage(request, 'uncertain', now);
    await adapter.begin('uncertain');
    await assert.rejects(adapter.start('uncertain', later), /no longer available/);
    await assert.rejects(adapter.begin('uncertain'), /no longer available/);
  });

  it('claims the completion email once and only after acceptance', async function () {
    const adapter = stager();
    await adapter.stage({ filePath: sourcePath, fileName: 'posts.csv', owner }, 'email', now);
    assert.equal(await adapter.claimEmail('email'), false);
    assert.equal(await adapter.claimCacheInvalidation('email'), false);
    await adapter.begin('email');
    assert.equal(await adapter.start('email', now), true);
    assert.equal(await adapter.claimCacheInvalidation('email'), true);
    assert.equal(await adapter.claimCacheInvalidation('email'), false);
    assert.equal(await adapter.start('email', now), true);
    assert.deepEqual(
      (await Promise.all([adapter.claimEmail('email'), adapter.claimEmail('email')]))
        .sort()
        .reverse(),
      [true, false],
    );
    assert.equal(await adapter.start('email', now), false);
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
    assert.equal(await adapter.claim('claim', owner, now), true);
    await assert.rejects(adapter.lookup('claim', owner, now), {
      code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    });
    await assert.rejects(adapter.claim('claim', owner, now), {
      code: 'CSV_IMPORT_SUBMISSION_UNCERTAIN',
    });
    await assert.rejects(adapter.cancel('claim', owner), { errorType: 'ConflictError' });
    await adapter.acknowledge('claim');
    assert.equal(await adapter.claim('claim', owner, now), false);
    assert.deepEqual(await adapter.lookup('claim', owner, now), { status: 'accepted' });
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
    const claim = assert.rejects(adapter.claim('cancel', owner, now), {
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
      await save({ ...file, name: 'partial' }, target);
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
    await adapter.begin('uncertain');
    await adapter.begin('racing');
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
