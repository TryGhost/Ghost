import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { ImportUploadRepository } from '../../../../../../core/server/services/content-import/import/upload-repository';

describe('CSV upload manifests', function () {
  const prefix = 'content-csv-uploads/site';
  const owner = { id: 'staff', type: 'user' } as const;
  const file = { key: 'content-csv-import/site/upload/source', name: 'posts.csv' };
  const now = new Date('2026-01-01');
  let directory: string;
  let storage: LocalStorageBase;
  let uploads: ImportUploadRepository;

  beforeEach(async function () {
    directory = await mkdtemp(path.join(os.tmpdir(), 'content-import-manifests-'));
    storage = new LocalStorageBase({ storagePath: directory });
    uploads = new ImportUploadRepository(
      () => storage,
      () => prefix,
    );
  });

  afterEach(async function () {
    sinon.restore();
    await rm(directory, { recursive: true, force: true });
  });

  it('creates an owner-bound manifest with a 24-hour expiry', async function () {
    await uploads.create('upload', owner, now, file);
    await assert.rejects(uploads.create('upload', { ...owner, id: 'other' }, now, file), {
      errorType: 'ConflictError',
    });
    assert.deepEqual(await uploads.get('upload'), {
      owner_id: owner.id,
      owner_type: owner.type,
      file,
      expires_at: new Date('2026-01-02'),
      state: 'staging',
      receipt: null,
    });
    await uploads.remove('upload');
    assert.equal(await uploads.get('upload'), undefined);
  });

  it('rereads an upload after a conflict and bounds repeated conflicts', async function () {
    await uploads.create('upload', owner, now, file);
    const writer = storage.writeVersionedMetadata.bind(storage);
    const conditionalWrite = sinon.stub(storage, 'writeVersionedMetadata').callsFake(writer);
    conditionalWrite.onFirstCall().resolves(false);
    assert.equal(
      await uploads.change('upload', () => ({ value: 1, change: { state: 'ready' } })),
      1,
    );
    assert.equal((await uploads.get('upload'))?.state, 'ready');
    conditionalWrite.resolves(false);
    await assert.rejects(
      uploads.change('upload', () => ({ value: 1, change: { state: 'submitting' } })),
      { errorType: 'ConflictError' },
    );
    assert.equal((await uploads.get('upload'))?.state, 'ready');
  });

  it('rejects oversized upload details before publishing a manifest', async function () {
    await assert.rejects(
      uploads.create('upload', owner, now, { ...file, name: 'ä'.repeat(8192) + '.csv' }),
      /CSV file name is too long/,
    );
    assert.deepEqual(await storage.listPrefix(prefix), { keys: [] });
  });

  it('rejects an oversized manifest before decoding it', async function () {
    await storage.writeVersionedMetadata(
      prefix + '/upload.json',
      Buffer.alloc(16 * 1024 + 1),
      null,
    );
    await assert.rejects(uploads.get('upload'), /Invalid CSV upload manifest/);
  });
});
