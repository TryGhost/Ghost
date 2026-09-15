import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';

import logging from '@tryghost/logging';
import { ImportFileStoreBase, isImportFileNotFound } from '@tryghost/adapter-base-import-files';
import { runImportFileStoreContractTests } from '@tryghost/adapter-base-import-files/contract-test-suite';

import FileStore from '../../../../../core/server/adapters/import-files/FileStore';

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe('import-files FileStore', function () {
  let basePath: string;

  beforeEach(function () {
    basePath = path.join(os.tmpdir(), `import-files-filestore-${crypto.randomUUID()}`);
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(basePath);
  });

  runImportFileStoreContractTests(
    () => new FileStore({ basePath }),
    { describe, it },
    {
      largeBodyBytes: 256 * 1024,
    },
  );

  describe('adapter contract', function () {
    it('extends ImportFileStoreBase and declares the four required methods', function () {
      const store = new FileStore({ basePath });

      assert.ok(store instanceof ImportFileStoreBase);
      assert.deepEqual([...store.requiredFns], ['put', 'get', 'head', 'delete']);
    });

    it('validates its config without instantiating', function () {
      assert.doesNotThrow(() => FileStore.validate(undefined));
      assert.doesNotThrow(() => FileStore.validate({}));
      assert.doesNotThrow(() => FileStore.validate({ basePath }));
      assert.throws(() => FileStore.validate({ basePath: '' }), /basePath/);
      assert.throws(() => FileStore.validate({ basePath: 42 }), /basePath/);
    });
  });

  describe('root directory', function () {
    it('defaults to a per-user ghost-import-files folder in the OS temp directory', function () {
      const store = new FileStore(undefined);

      // Two installs running as different users on one machine must not meet here.
      const suffix = typeof process.getuid === 'function' ? `-${process.getuid()}` : '';
      assert.equal(store.basePath, path.join(os.tmpdir(), `ghost-import-files${suffix}`));
    });

    it('does not create anything until the first put', async function () {
      new FileStore({ basePath });

      assert.equal(await fs.pathExists(basePath), false);
    });

    it('creates private directories and files on put', async function () {
      const store = new FileStore({ basePath });

      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      const filePath = path.join(basePath, 'members-import/run1/rows.ndjson');
      assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
      assert.equal((await fs.stat(path.dirname(filePath))).mode & 0o777, 0o700);
      assert.equal((await fs.stat(basePath)).mode & 0o777, 0o700);
    });
  });

  describe('put', function () {
    it('refuses to overwrite a key that is already stored and keeps the first file', async function () {
      const store = new FileStore({ basePath });
      const key = 'members-import/run1/rows.ndjson';
      await store.put(key, Buffer.from('first'), { contentType: 'text/plain' });

      await assert.rejects(
        store.put(key, Buffer.from('second'), { contentType: 'text/plain' }),
        /already stored/,
      );

      assert.equal((await collect(await store.get(key))).toString('utf8'), 'first');
      assert.deepEqual(await fs.readdir(path.join(basePath, 'members-import/run1')), [
        'rows.ndjson',
      ]);
    });

    it('surfaces a key directory that cannot be created and leaves nothing behind', async function () {
      const store = new FileStore({ basePath });
      // The first mkdir creates the root; the second, for the key's directory, fails.
      const mkdir = sinon.stub(fs, 'mkdir').callThrough();
      mkdir
        .onSecondCall()
        .rejects(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));

      await assert.rejects(
        store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' }),
        /EACCES/,
      );

      sinon.restore();
      assert.equal(await fs.pathExists(path.join(basePath, 'a')), false);
      assert.deepEqual(await fs.readdir(basePath), []);
    });

    it('closes a root of its own that its group or others could write into', async function () {
      await fs.ensureDir(basePath);
      await fs.chmod(basePath, 0o770);
      const warn = sinon.stub(logging, 'warn');
      const store = new FileStore({ basePath });

      const stored = await store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' });

      assert.equal(stored.size, 1);
      assert.equal((await fs.stat(basePath)).mode & 0o777, 0o700);
      sinon.assert.notCalled(warn);
    });

    it('warns once, and carries on, when a root of its own cannot be made private', async function () {
      await fs.ensureDir(basePath);
      await fs.chmod(basePath, 0o775);
      // A filesystem that ignores mode changes: chmod succeeds but changes nothing.
      sinon.stub(fs, 'chmod').resolves();
      const warn = sinon.stub(logging, 'warn');
      const store = new FileStore({ basePath });

      await store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' });
      await store.put('a/b/d.txt', Buffer.from('y'), { contentType: 'text/plain' });

      sinon.assert.calledOnce(warn);
      const [details, message] = warn.firstCall.args as [{ event: { name: string } }, string];
      assert.deepEqual(details.event, { name: 'import-files.root_not_private' });
      assert.match(message, /set adapters\.import-files\.FileStore\.basePath/);
    });

    it('accepts a root that only its owner can write into', async function () {
      await fs.ensureDir(basePath);
      await fs.chmod(basePath, 0o755);
      const store = new FileStore({ basePath });

      const stored = await store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' });

      assert.equal(stored.size, 1);
    });

    it('refuses a root that is a symbolic link and touches nothing behind it', async function () {
      const realRoot = path.join(os.tmpdir(), `import-files-real-${crypto.randomUUID()}`);
      // A file already sitting where the key would land: refusing the root must not
      // "clean it up" on the way out.
      await fs.outputFile(path.join(realRoot, 'a/b/c.txt'), "someone else's file");
      await fs.symlink(realRoot, basePath);
      const store = new FileStore({ basePath });

      try {
        await assert.rejects(
          store.put('a/b/c.txt', Buffer.from('x'), { contentType: 'text/plain' }),
          /symbolic link or is not owned/,
        );
        assert.equal(
          await fs.readFile(path.join(realRoot, 'a/b/c.txt'), 'utf8'),
          "someone else's file",
        );
      } finally {
        await fs.remove(realRoot);
      }
    });

    it('leaves nothing behind when the body stream fails part-way', async function () {
      const store = new FileStore({ basePath });
      const key = 'content-csv-import/run1/upload.csv';
      const failing = new Readable({
        read() {
          this.push('title\n');
          this.destroy(new Error('upload interrupted'));
        },
      });

      await assert.rejects(
        store.put(key, failing, { contentType: 'text/csv', contentLength: 100 }),
        /upload interrupted/,
      );

      assert.equal(await store.head(key), null);
      assert.equal(await fs.pathExists(path.join(basePath, 'content-csv-import/run1')), false);
    });

    it('stops writing a stream that sends more than it declared and leaves nothing behind', async function () {
      const store = new FileStore({ basePath });
      const key = 'content-csv-import/run1/upload.csv';
      let pushed = 0;
      const endless = new Readable({
        read() {
          pushed += 64 * 1024;
          this.push(Buffer.alloc(64 * 1024, 1));
        },
      });

      await assert.rejects(
        store.put(key, endless, { contentType: 'text/csv', contentLength: 100 }),
        /more than the declared contentLength of 100/,
      );

      assert.equal(await store.head(key), null);
      assert.equal(await fs.pathExists(path.join(basePath, 'content-csv-import/run1')), false);
      assert.ok(pushed < 10 * 1024 * 1024, 'the stream was stopped early');
      // The shared kind directory stays; only the import's own directory is pruned.
      assert.equal(await fs.pathExists(path.join(basePath, 'content-csv-import')), true);
    });

    it('rejects a stream whose declared length does not match what arrived', async function () {
      const store = new FileStore({ basePath });
      const key = 'content-csv-import/run1/upload.csv';

      await assert.rejects(
        store.put(key, Readable.from([Buffer.from('short')]), {
          contentType: 'text/csv',
          contentLength: 99,
        }),
        /contentLength/,
      );

      assert.equal(await store.head(key), null);
    });
  });

  describe('head', function () {
    it('derives the content type from the key extension', async function () {
      const store = new FileStore({ basePath });
      const cases: Array<[string, string]> = [
        ['members-import/run1/rows.ndjson', 'application/x-ndjson'],
        ['content-csv-import/run1/upload.csv', 'text/csv'],
        ['content-csv-import/run1/upload.zip', 'application/zip'],
        ['site-content-import/run1/upload.json', 'application/json'],
        ['site-content-import/run1/upload.bin', 'application/octet-stream'],
      ];
      for (const [key] of cases) {
        await store.put(key, Buffer.from('x'), { contentType: 'text/plain' });
      }

      for (const [key, contentType] of cases) {
        assert.deepEqual(await store.head(key), { size: 1, contentType }, key);
      }
    });

    it('treats a key that names a directory as missing', async function () {
      const store = new FileStore({ basePath });
      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      assert.equal(await store.head('members-import/run1'), null);
      assert.equal(await store.head('members-import'), null);
    });

    it('treats a path through a stored file, or one too long to exist, as missing', async function () {
      const store = new FileStore({ basePath });
      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });
      const tooLong = `members-import/run1/${'x'.repeat(300)}`;

      assert.equal(await store.head('members-import/run1/rows.ndjson/inside'), null);
      assert.equal(await store.head(tooLong), null);
      await assert.rejects(store.get('members-import/run1/rows.ndjson/inside'), (err: unknown) =>
        isImportFileNotFound(err),
      );
      await assert.rejects(store.get(tooLong), (err: unknown) => isImportFileNotFound(err));
    });

    it('rethrows a failure that is not a missing file', async function () {
      const store = new FileStore({ basePath });
      sinon
        .stub(fs, 'stat')
        .rejects(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));

      await assert.rejects(store.head('a/b/c'), /EACCES/);
    });
  });

  describe('get', function () {
    it('rejects a missing key with a not-found error before opening a stream', async function () {
      const store = new FileStore({ basePath });

      await assert.rejects(store.get('members-import/run1/rows.ndjson'), (err: unknown) => {
        assert.ok(isImportFileNotFound(err));
        return true;
      });
    });

    it('rejects a key that names a directory with the not-found error', async function () {
      const store = new FileStore({ basePath });
      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      await assert.rejects(store.get('members-import/run1'), (err: unknown) =>
        isImportFileNotFound(err),
      );
    });
  });

  describe('delete', function () {
    it('removes the file and the import directory, and leaves the shared kind directory', async function () {
      const store = new FileStore({ basePath });
      const key = 'members-import/run1/rows.ndjson';
      await store.put(key, Buffer.from('{}\n'), { contentType: 'application/x-ndjson' });

      await store.delete(key);

      assert.equal(await fs.pathExists(path.join(basePath, 'members-import/run1')), false);
      // Shared by every members import: pulling it out from under a concurrent
      // request's mkdir is not worth the tidiness.
      assert.equal(await fs.pathExists(path.join(basePath, 'members-import')), true);
      assert.equal(await fs.pathExists(basePath), true);
    });

    it('keeps a directory that still holds another import', async function () {
      const store = new FileStore({ basePath });
      await store.put('members-import/run1/rows.ndjson', Buffer.from('a'), {
        contentType: 'text/plain',
      });
      await store.put('members-import/run2/rows.ndjson', Buffer.from('b'), {
        contentType: 'text/plain',
      });

      await store.delete('members-import/run1/rows.ndjson');

      assert.equal(await fs.pathExists(path.join(basePath, 'members-import/run1')), false);
      assert.equal(
        await fs.pathExists(path.join(basePath, 'members-import/run2/rows.ndjson')),
        true,
      );
    });

    it('leaves a directory of stored files alone when asked to delete its key', async function () {
      const store = new FileStore({ basePath });
      await store.put('members-import/run1/rows.ndjson', Buffer.from('{}\n'), {
        contentType: 'application/x-ndjson',
      });

      await store.delete('members-import/run1');
      await store.delete('members-import');

      assert.equal((await store.head('members-import/run1/rows.ndjson'))?.size, 3);
    });

    it('rethrows a failure that is not a missing file', async function () {
      const store = new FileStore({ basePath });
      await store.put('a/b/c.txt', Buffer.from('a'), { contentType: 'text/plain' });
      sinon.stub(fs, 'unlink').rejects(
        Object.assign(new Error('EACCES: permission denied'), {
          code: 'EACCES',
        }),
      );

      await assert.rejects(store.delete('a/b/c.txt'), /EACCES/);
    });

    it('does not pass off a regular file that cannot be unlinked as deleted', async function () {
      const store = new FileStore({ basePath });
      await store.put('a/b/c.txt', Buffer.from('a'), { contentType: 'text/plain' });
      // EPERM is what a directory gives on macOS, but on a regular file it means
      // the file is still there (immutable, say) and the caller must hear about it.
      sinon
        .stub(fs, 'unlink')
        .rejects(Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' }));

      await assert.rejects(store.delete('a/b/c.txt'), /EPERM/);
    });
  });
});
