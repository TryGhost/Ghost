import type { Readable } from 'node:stream';
import errors from '@tryghost/errors';

export interface ImportStoragePage {
  keys: string[];
  cursor?: string;
}

export interface ImportStorageListOptions {
  cursor?: string;
  limit?: number;
}

// A capability of imports storage, not a requirement for existing StorageBase consumers.
// Keys are relative to the configured adapter, and list prefixes name directories.
export interface ImportStorage {
  readStream(options: { path: string }): Promise<Readable>;
  writeStream(key: string, source: Readable): Promise<void>;
  replaceMetadata(key: string, bytes: Buffer): Promise<void>;
  listPrefix(prefix: string, options?: ImportStorageListOptions): Promise<ImportStoragePage>;
  delete(key: string): Promise<void>;
}

export interface VersionedMetadata {
  bytes: Buffer;
  version: string;
}

export interface VersionedImportStorage extends ImportStorage {
  readVersionedMetadata(key: string): Promise<VersionedMetadata | undefined>;
  // null creates a new object. A version only allows replacing that revision.
  writeVersionedMetadata(key: string, bytes: Buffer, version: string | null): Promise<boolean>;
  deleteVersionedMetadata(key: string): Promise<void>;
}

export const MAX_IMPORT_METADATA_BYTES = 16 * 1024;

export async function readImportMetadata(source: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of source) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_IMPORT_METADATA_BYTES) {
      throw new errors.InternalServerError({ message: 'Invalid CSV upload manifest.' });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, bytes);
}
