import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import os from 'node:os';
import path from 'node:path';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { createReportArchive } from '../../../../../../core/server/services/content-import/import/report-archive';

describe('private CSV reports', function () {
  const id = '123456789012345678901234';
  const owner = { type: 'user' as const, id: 'requester' };
  const now = new Date('2026-01-01');
  const expiresAt = new Date('2026-01-08');
  const files = [{ name: 'report.csv' as const, bytes: 10 }];
  const fail = (error: unknown) => assert.fail(String(error));
  let directory: string;
  let storage: LocalStorageBase;
  let archive: ReturnType<typeof createReportArchive>;

  beforeEach(async function () {
    directory = await mkdtemp(path.join(os.tmpdir(), 'csv-private-reports-'));
    storage = new LocalStorageBase({ storagePath: directory });
    archive = createReportArchive(
      () => storage,
      () => 'site',
    );
  });

  afterEach(async function () {
    await rm(directory, { recursive: true, force: true });
  });

  it('streams only retained files for the requesting user on the current site', async function () {
    const source = { readStream: async () => Readable.from(['title\nOne']) };
    await archive.retain(id, owner.id, files, source, now);
    const stream = await archive.open(id, 'report.csv', owner, now);
    let text = '';
    for await (const chunk of stream) {
      text += chunk.toString();
    }
    assert.equal(text, 'title\nOne');
    await assert.rejects(archive.open(id, 'errors.csv', owner, now), {
      errorType: 'NotFoundError',
    });
    await assert.rejects(archive.open(id, '../report.csv', owner, now), {
      errorType: 'NotFoundError',
    });
    await assert.rejects(archive.open(id, 'report.csv', { ...owner, id: 'another' }, now), {
      errorType: 'NotFoundError',
    });
    await assert.rejects(archive.open(id, 'report.csv', { ...owner, type: 'integration' }, now), {
      errorType: 'NotFoundError',
    });
    const anotherSite = createReportArchive(
      () => storage,
      () => 'other-site',
    );
    await assert.rejects(anotherSite.open(id, 'report.csv', owner, now), {
      errorType: 'NotFoundError',
    });
    await archive.expire(now, fail);
    (await archive.open(id, 'report.csv', owner, now)).destroy();
    await assert.rejects(archive.open(id, 'report.csv', owner, expiresAt), {
      errorType: 'NotFoundError',
    });
    await archive.expire(expiresAt, fail);
    assert.deepEqual((await storage.listPrefix('content-csv-import-reports/site')).keys, []);
  });

  it('hides a partial copy and expires it through the staged manifest', async function () {
    const source = {
      readStream: async () => {
        throw new Error('read failed');
      },
    };
    await assert.rejects(archive.retain(id, owner.id, files, source, now), /read failed/);
    await assert.rejects(archive.open(id, 'report.csv', owner, now), {
      errorType: 'NotFoundError',
    });
    await archive.expire(expiresAt, fail);
    assert.deepEqual((await storage.listPrefix('content-csv-import-reports/site')).keys, []);
  });

  it('keeps the expiry manifest until a failed report deletion can be retried', async function () {
    await archive.retain(
      id,
      owner.id,
      files,
      { readStream: async () => Readable.from(['test']) },
      now,
    );
    const deletion = vi.spyOn(storage, 'delete').mockRejectedValueOnce(new Error('delete failed'));
    const report = vi.fn();
    await archive.expire(expiresAt, report);
    expect(report).toHaveBeenCalledTimes(1);
    const { keys } = await storage.listPrefix('content-csv-import-reports/site');
    assert.ok(keys.some((key) => key.endsWith('/manifest.json')));
    deletion.mockRestore();
    await archive.expire(expiresAt, fail);
    assert.deepEqual((await storage.listPrefix('content-csv-import-reports/site')).keys, []);
  });
});
