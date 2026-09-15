import type { Readable } from 'node:stream';
import errors from '@tryghost/errors';

/**
 * Options for `put`. A stream body must declare its `contentLength` so a store
 * can choose between one upload and an upload in parts without buffering a part
 * first; every caller in Ghost knows the length (a Buffer knows its own, an
 * upload on disk has a size), so this is the simpler contract.
 */
export interface PutOptions {
  contentType: string;
  contentLength?: number;
}

/** What a store knows about a stored file without reading it. */
export interface StoredFile {
  size: number;
  contentType: string;
}

/**
 * The place an import's bytes wait between the request that accepted them and
 * the job that processes them. Keys are composed by Ghost (see `assertValidKey`),
 * bytes are streamed in and out, nothing is ever served or listed.
 *
 * Keys carry an import id that is unique per import, so the same key is never
 * written twice by design. Writing a key twice is undefined: the local store
 * refuses it as a defence, other stores may overwrite.
 */
export interface ImportFileStore {
  put(key: string, body: Buffer | Readable, options: PutOptions): Promise<StoredFile>;
  /** Rejects with a not-found error (see `isImportFileNotFound`) when the key is gone. */
  get(key: string): Promise<Readable>;
  /**
   * `null` always means "definitely not there"; any other failure rejects. The
   * content type is the one recorded at `put` where the store keeps one, or one
   * derived from the key's extension.
   */
  head(key: string): Promise<StoredFile | null>;
  /** Idempotent: a missing key resolves. */
  delete(key: string): Promise<void>;
}

export const REQUIRED_FNS = Object.freeze(['put', 'get', 'head', 'delete'] as const);

export abstract class ImportFileStoreBase implements ImportFileStore {
  declare readonly requiredFns: readonly ['put', 'get', 'head', 'delete'];

  constructor() {
    Object.defineProperty(this, 'requiredFns', {
      value: REQUIRED_FNS,
      writable: false,
    });
  }

  abstract put(key: string, body: Buffer | Readable, options: PutOptions): Promise<StoredFile>;
  abstract get(key: string): Promise<Readable>;
  abstract head(key: string): Promise<StoredFile | null>;
  abstract delete(key: string): Promise<void>;
}

export const IMPORT_FILE_NOT_FOUND = 'IMPORT_FILE_NOT_FOUND';
export const INVALID_IMPORT_FILE_KEY = 'INVALID_IMPORT_FILE_KEY';

/** The error `get` rejects with when the key holds nothing. */
export function importFileNotFoundError(key: string): errors.NotFoundError {
  return new errors.NotFoundError({
    message: `Import file not found: ${key}`,
    code: IMPORT_FILE_NOT_FOUND,
    context: key,
  });
}

/**
 * Recognises a not-found error by its code rather than its class, so an adapter
 * that bundles a second copy of this package still interoperates.
 */
export function isImportFileNotFound(err: unknown): err is { code: typeof IMPORT_FILE_NOT_FOUND } {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === IMPORT_FILE_NOT_FOUND
  );
}

/** The error every method rejects with when the key breaks the rules in `assertValidKey`. */
export function invalidImportFileKeyError(reason: string): errors.IncorrectUsageError {
  return new errors.IncorrectUsageError({
    message: `Invalid import file key: ${reason}`,
    code: INVALID_IMPORT_FILE_KEY,
  });
}

export function isInvalidImportFileKey(
  err: unknown,
): err is { code: typeof INVALID_IMPORT_FILE_KEY } {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === INVALID_IMPORT_FILE_KEY
  );
}

export const MAX_KEY_BYTES = 1024;

const SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * A key is relative, under 1,024 bytes, and made of `/`-separated segments of
 * `[A-Za-z0-9._-]`. No segment may be empty, `.` or `..`, so a key can never
 * escape a store's root or name a directory. Every store calls this on every
 * method; consumers compose keys with these rules in mind.
 */
export function assertValidKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw invalidImportFileKeyError('a key must be a non-empty string');
  }
  if (Buffer.byteLength(key, 'utf8') > MAX_KEY_BYTES) {
    throw invalidImportFileKeyError(`a key must be at most ${MAX_KEY_BYTES} bytes`);
  }
  for (const segment of key.split('/')) {
    if (segment === '' || segment === '.' || segment === '..' || !SEGMENT.test(segment)) {
      throw invalidImportFileKeyError(
        `"${key.slice(0, 80)}" must be relative segments of [A-Za-z0-9._-] with no empty, "." or ".." segment`,
      );
    }
  }
}
