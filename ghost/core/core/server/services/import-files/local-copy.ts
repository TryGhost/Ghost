import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import type { ImportFileStore } from '@tryghost/adapter-base-import-files';

const logging = require('@tryghost/logging');

export interface LocalCopyOptions {
  // Called instead of the default warning when the local copy cannot be removed
  // afterwards. A cleanup failure never changes what `fn` returned or threw.
  onCleanupError?: (error: unknown) => void;
}

/**
 * Stream a stored file to a private file on this machine, run `fn` with its path
 * and remove it afterwards, whatever `fn` did. For consumers whose next step
 * takes a path (zip extraction, the CSV parser). The local file keeps the key's
 * name so extension-based checks see the original extension. The stored file is
 * left alone: deleting it is the import's decision.
 */
export async function withLocalCopy<T>(
  store: ImportFileStore,
  key: string,
  fn: (localPath: string) => Promise<T>,
  { onCleanupError }: LocalCopyOptions = {},
): Promise<T> {
  // Resolved before anything touches the disk, so a missing key rejects with the
  // store's not-found error and leaves no directory behind.
  const body = await store.get(key);
  let directory: string;
  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-import-files-'));
  } catch (error) {
    // The stream is already open on the store; release it before giving up.
    body.destroy();
    throw error;
  }

  try {
    const localPath = path.join(directory, path.posix.basename(key));
    await pipeline(body, fs.createWriteStream(localPath, { mode: 0o600, flags: 'wx' }));
    return await fn(localPath);
  } finally {
    try {
      await fs.remove(directory);
    } catch (error) {
      if (onCleanupError) {
        onCleanupError(error);
      } else {
        logging.warn(
          { event: { name: 'import-files.local_copy_left_behind' }, key, err: error },
          'The local copy of an import file could not be removed',
        );
      }
    }
  }
}
