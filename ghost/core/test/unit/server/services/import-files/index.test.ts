import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';

import {
  isImportFileNotFound,
  isInvalidImportFileKey,
  type ImportFileStore,
} from '@tryghost/adapter-base-import-files';

import FileStore from '../../../../../core/server/adapters/import-files/FileStore';
import * as importFiles from '../../../../../core/server/services/import-files';

const { importFileKey, withLocalCopy } = importFiles;

describe('import-files service', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('importFileKey', function () {
    it('composes <kind>/<importId>/<name>', function () {
      assert.equal(
        importFileKey('members-import', '68c8f1e2a9b3c4d5e6f70123', 'rows.ndjson'),
        'members-import/68c8f1e2a9b3c4d5e6f70123/rows.ndjson',
      );
      assert.equal(
        importFileKey('content-csv-import', 'run_1', 'upload.csv'),
        'content-csv-import/run_1/upload.csv',
      );
    });

    it('refuses an import id or name that would change the key layout', function () {
      for (const [importId, name] of [
        ['run/1', 'rows.ndjson'],
        ['run1', '../rows.ndjson'],
        ['', 'rows.ndjson'],
        ['run1', ''],
        ['run1', 'rows ndjson'],
      ]) {
        assert.throws(
          () => importFileKey('members-import', importId, name),
          (err: unknown) => isInvalidImportFileKey(err),
          `${importId}/${name}`,
        );
      }
    });
  });

  describe('withLocalCopy', function () {
    let basePath: string;
    let store: FileStore;

    beforeEach(function () {
      basePath = path.join(os.tmpdir(), `import-files-service-${crypto.randomUUID()}`);
      store = new FileStore({ basePath });
    });

    afterEach(async function () {
      await fs.remove(basePath);
    });

    it('hands the callback a private local file carrying the key name and removes it afterwards', async function () {
      const key = importFileKey('content-csv-import', 'run1', 'upload.zip');
      await store.put(key, Buffer.from('PK...'), { contentType: 'application/zip' });
      let seenPath = '';

      const result = await withLocalCopy(store, key, async (localPath) => {
        seenPath = localPath;
        assert.equal(path.basename(localPath), 'upload.zip');
        assert.equal(await fs.readFile(localPath, 'utf8'), 'PK...');
        assert.equal((await fs.stat(localPath)).mode & 0o777, 0o600);
        return 'done';
      });

      assert.equal(result, 'done');
      assert.equal(await fs.pathExists(path.dirname(seenPath)), false);
      // The stored file is untouched: deleting it is the import's decision.
      assert.equal((await store.head(key))?.size, 5);
    });

    it('removes the local copy when the callback throws', async function () {
      const key = importFileKey('content-csv-import', 'run1', 'upload.csv');
      await store.put(key, Buffer.from('title\n'), { contentType: 'text/csv' });
      let seenPath = '';

      await assert.rejects(
        withLocalCopy(store, key, async (localPath) => {
          seenPath = localPath;
          throw new Error('import failed');
        }),
        /import failed/,
      );

      assert.equal(await fs.pathExists(path.dirname(seenPath)), false);
    });

    it('removes the local copy when the stored stream fails part-way', async function () {
      const mkdtemp = sinon.spy(fs, 'mkdtemp');
      const failing = {
        ...store,
        get: async () =>
          new Readable({
            read() {
              this.push('title\n');
              this.destroy(new Error('mid-stream'));
            },
          }),
      } as unknown as ImportFileStore;

      await assert.rejects(
        withLocalCopy(failing, 'content-csv-import/run1/upload.csv', async () => 'unreachable'),
        /mid-stream/,
      );

      sinon.assert.calledOnce(mkdtemp);
      const directory = await (mkdtemp.firstCall.returnValue as unknown as Promise<string>);
      assert.equal(await fs.pathExists(directory), false);
    });

    it('rejects with the not-found error before creating anything when the key is gone', async function () {
      const mkdtemp = sinon.spy(fs, 'mkdtemp');

      await assert.rejects(
        withLocalCopy(store, 'content-csv-import/run1/missing.csv', async () => 'unreachable'),
        (err: unknown) => isImportFileNotFound(err),
      );

      sinon.assert.notCalled(mkdtemp);
    });

    it('releases the stored stream when no working directory can be created', async function () {
      const key = importFileKey('content-csv-import', 'run1', 'upload.csv');
      await store.put(key, Buffer.from('title\n'), { contentType: 'text/csv' });
      const body = await store.get(key);
      const stubbedStore = { ...store, get: async () => body } as unknown as ImportFileStore;
      sinon.stub(fs, 'mkdtemp').rejects(Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }));

      await assert.rejects(
        withLocalCopy(stubbedStore, key, async () => 'unreachable'),
        /ENOSPC/,
      );

      assert.equal(body.destroyed, true);
    });

    it('does not change the outcome when the local copy cannot be removed', async function () {
      const key = importFileKey('content-csv-import', 'run1', 'upload.csv');
      await store.put(key, Buffer.from('title\n'), { contentType: 'text/csv' });
      const cleanupError = Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' });
      const remove = sinon.stub(fs, 'remove').rejects(cleanupError);
      const reported: unknown[] = [];

      const result = await withLocalCopy(store, key, async () => 'done', {
        onCleanupError: (error) => reported.push(error),
      });

      remove.restore();
      assert.equal(result, 'done');
      assert.deepEqual(reported, [cleanupError]);
    });
  });

  describe('service wiring', function () {
    // One test, because the module holds one store per process and the steps
    // only mean something in this order.
    it('resolves the configured store on first use and then keeps it', function () {
      // Nothing has called init(): the shipped default is resolved on demand, so a
      // caller that wires an import without booting still gets a working store.
      // The adapter loader requires the class, so it is a different object from the
      // FileStore imported here; the name and the root say what was resolved.
      const resolved = importFiles.getStore() as FileStore;
      assert.equal(resolved.constructor.name, 'FileStore');
      const suffix = typeof process.getuid === 'function' ? `-${process.getuid()}` : '';
      assert.equal(resolved.basePath, path.join(os.tmpdir(), `ghost-import-files${suffix}`));

      importFiles.init(new FileStore({ basePath: path.join(os.tmpdir(), 'another') }));

      assert.equal(importFiles.getStore(), resolved);
    });
  });
});
