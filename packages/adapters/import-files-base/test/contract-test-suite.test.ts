import { Readable } from 'node:stream';
import { describe, it } from 'vitest';

import errors from '@tryghost/errors';

import {
  ImportFileStoreBase,
  assertValidKey,
  importFileNotFoundError,
  type PutOptions,
  type StoredFile,
} from '../src/base.ts';
import { runImportFileStoreContractTests } from '../src/contract-test-suite.ts';

async function collect(body: Buffer | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// A reference implementation that lives only in this test: it proves the suite
// is runnable and that its cases describe a satisfiable contract. Ghost's real
// stores live in ghost/core.
class ReferenceStore extends ImportFileStoreBase {
  private readonly files = new Map<string, { bytes: Buffer; contentType: string }>();

  async put(key: string, body: Buffer | Readable, options: PutOptions): Promise<StoredFile> {
    assertValidKey(key);
    if (!Buffer.isBuffer(body) && typeof options.contentLength !== 'number') {
      throw new errors.IncorrectUsageError({
        message: 'a stream body must declare its contentLength',
      });
    }
    const bytes = await collect(body);
    if (!Buffer.isBuffer(body) && bytes.length !== options.contentLength) {
      throw new errors.IncorrectUsageError({ message: 'body length did not match contentLength' });
    }
    this.files.set(key, { bytes, contentType: options.contentType });
    return { size: bytes.length, contentType: options.contentType };
  }

  async get(key: string): Promise<Readable> {
    assertValidKey(key);
    const file = this.files.get(key);
    if (!file) {
      throw importFileNotFoundError(key);
    }
    return Readable.from([file.bytes]);
  }

  async head(key: string): Promise<StoredFile | null> {
    assertValidKey(key);
    const file = this.files.get(key);
    return file ? { size: file.bytes.length, contentType: file.contentType } : null;
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    this.files.delete(key);
  }
}

runImportFileStoreContractTests(
  () => new ReferenceStore(),
  { describe, it },
  {
    largeBodyBytes: 64 * 1024,
  },
);
