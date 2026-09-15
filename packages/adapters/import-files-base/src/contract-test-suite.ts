import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import { INVALID_IMPORT_FILE_KEY, isImportFileNotFound, type ImportFileStore } from './base.ts';

export type StoreFactory = () => ImportFileStore | Promise<ImportFileStore>;

export interface ImportFileStoreContractFramework {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => void | Promise<void>): void;
}

export interface ImportFileStoreContractOptions {
  /**
   * The body size above which a store switches strategy (an upload in parts for
   * S3). The suite writes one body larger than this so that path is exercised.
   * Defaults to 1 MiB.
   */
  largeBodyBytes?: number;
}

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function chunked(bytes: Buffer, chunkSize: number): Readable {
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytes.subarray(offset, offset + chunkSize));
  }
  return Readable.from(chunks);
}

const UNSAFE_KEYS = [
  '',
  '/a/b',
  'a//b',
  'a/b/',
  '.',
  '..',
  '../a',
  'a/../b',
  'a/./b',
  'a b',
  'a\\b',
  'a/b\0c',
  'a/ü',
  'x'.repeat(1025),
];

/**
 * The behaviour every import file store must share. Run it against each
 * implementation from its own test file, unit or integration, with a factory
 * that returns a store ready to use.
 */
export function runImportFileStoreContractTests(
  makeStore: StoreFactory,
  { describe, it }: ImportFileStoreContractFramework,
  options: ImportFileStoreContractOptions = {},
): void {
  const largeBodyBytes = options.largeBodyBytes ?? 1024 * 1024;
  const run = randomBytes(4).toString('hex');
  let counter = 0;
  const uniqueKey = (name: string): string => `contract/${run}-${(counter += 1)}/${name}`;

  describe('import file store contract', function () {
    it('stores a buffer and streams the same bytes back', async function () {
      const store = await makeStore();
      const key = uniqueKey('rows.ndjson');

      const stored = await store.put(key, Buffer.from('{"email":"a@example.com"}\n'), {
        contentType: 'application/x-ndjson',
      });

      assert.deepEqual(stored, { size: 26, contentType: 'application/x-ndjson' });
      assert.equal(
        (await collect(await store.get(key))).toString('utf8'),
        '{"email":"a@example.com"}\n',
      );
      assert.deepEqual(await store.head(key), { size: 26, contentType: 'application/x-ndjson' });
    });

    it('stores a stream with a declared length', async function () {
      const store = await makeStore();
      const key = uniqueKey('upload.csv');
      const bytes = Buffer.from('title\nFirst\nSecond\n');

      const stored = await store.put(key, chunked(bytes, 4), {
        contentType: 'text/csv',
        contentLength: bytes.length,
      });

      assert.deepEqual(stored, { size: bytes.length, contentType: 'text/csv' });
      assert.deepEqual(await collect(await store.get(key)), bytes);
      assert.deepEqual(await store.head(key), { size: bytes.length, contentType: 'text/csv' });
    });

    it('stores a body larger than the store switches strategy at', async function () {
      const store = await makeStore();
      const key = uniqueKey('upload.zip');
      const bytes = randomBytes(largeBodyBytes + 12345);

      const stored = await store.put(key, chunked(bytes, 64 * 1024), {
        contentType: 'application/zip',
        contentLength: bytes.length,
      });

      assert.equal(stored.size, bytes.length);
      assert.equal(sha256(await collect(await store.get(key))), sha256(bytes));
      assert.equal((await store.head(key))?.size, bytes.length);
    });

    it('refuses a stream whose bytes do not match its declared length and keeps nothing', async function () {
      const store = await makeStore();
      const shortKey = uniqueKey('short.csv');
      const longKey = uniqueKey('long.csv');

      await assert.rejects(
        store.put(shortKey, chunked(Buffer.from('short'), 2), {
          contentType: 'text/csv',
          contentLength: 99,
        }),
      );
      await assert.rejects(
        store.put(longKey, chunked(Buffer.from('longer than declared'), 4), {
          contentType: 'text/csv',
          contentLength: 3,
        }),
      );

      assert.equal(await store.head(shortKey), null);
      assert.equal(await store.head(longKey), null);
    });

    it('treats a key that names a group of stored files, not a file, as missing', async function () {
      const store = await makeStore();
      const fileKey = uniqueKey('rows.ndjson');
      const groupKey = fileKey.slice(0, fileKey.lastIndexOf('/'));
      await store.put(fileKey, Buffer.from('{}\n'), { contentType: 'application/x-ndjson' });

      assert.equal(await store.head(groupKey), null);
      await assert.rejects(store.get(groupKey), (err: unknown) => isImportFileNotFound(err));
      // Deleting the group key is deleting something that is not there: the files stay.
      await store.delete(groupKey);
      assert.equal((await store.head(fileKey))?.size, 3);
    });

    it('refuses a stream that does not declare its length', async function () {
      const store = await makeStore();
      const key = uniqueKey('upload.csv');

      await assert.rejects(store.put(key, Readable.from(['x']), { contentType: 'text/csv' }));

      assert.equal(await store.head(key), null);
    });

    it('reports a missing file as null from head', async function () {
      const store = await makeStore();

      assert.equal(await store.head(uniqueKey('missing')), null);
    });

    it('rejects get of a missing file with a not-found error', async function () {
      const store = await makeStore();

      await assert.rejects(store.get(uniqueKey('missing')), (err: unknown) => {
        assert.ok(isImportFileNotFound(err), `expected a not-found error, got ${String(err)}`);
        return true;
      });
    });

    it('deletes a file and tolerates deleting it again', async function () {
      const store = await makeStore();
      const key = uniqueKey('rows.ndjson');
      await store.put(key, Buffer.from('gone'), { contentType: 'text/plain' });

      await store.delete(key);

      assert.equal(await store.head(key), null);
      await assert.rejects(store.get(key), (err: unknown) => isImportFileNotFound(err));
      await store.delete(key);
      await store.delete(uniqueKey('never-existed'));
    });

    it('keeps files apart by key', async function () {
      const store = await makeStore();
      const first = uniqueKey('rows.ndjson');
      const second = uniqueKey('rows.ndjson');
      await store.put(first, Buffer.from('first'), { contentType: 'text/plain' });
      await store.put(second, Buffer.from('second'), { contentType: 'text/plain' });

      assert.equal((await collect(await store.get(first))).toString('utf8'), 'first');
      assert.equal((await collect(await store.get(second))).toString('utf8'), 'second');

      await store.delete(first);

      assert.equal(await store.head(first), null);
      assert.equal((await store.head(second))?.size, 6);
    });

    it('refuses unsafe keys on every method without touching storage', async function () {
      const store = await makeStore();
      const isKeyError = (err: unknown) => {
        assert.equal((err as { code?: string }).code, INVALID_IMPORT_FILE_KEY);
        return true;
      };

      for (const key of UNSAFE_KEYS) {
        await assert.rejects(
          store.put(key, Buffer.from('x'), { contentType: 'text/plain' }),
          isKeyError,
          `put ${JSON.stringify(key)}`,
        );
        await assert.rejects(store.get(key), isKeyError, `get ${JSON.stringify(key)}`);
        await assert.rejects(store.head(key), isKeyError, `head ${JSON.stringify(key)}`);
        await assert.rejects(store.delete(key), isKeyError, `delete ${JSON.stringify(key)}`);
      }
    });
  });
}
