import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';
import { z } from 'zod';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import {
  ImportFileStoreBase,
  assertValidKey,
  importFileNotFoundError,
  type PutOptions,
  type StoredFile,
} from '@tryghost/adapter-base-import-files';

const DEFAULT_FOLDER = 'ghost-import-files';

// Every key Ghost composes ends in one of these; anything else reads as bytes.
const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.ndjson': 'application/x-ndjson',
  '.zip': 'application/zip',
};

const messages = {
  invalidBasePath: 'FileStore basePath must be a non-empty string when set.',
  missingContentLength: 'FileStore.put requires contentLength for a stream body.',
  lengthMismatch: 'FileStore.put received {received} bytes but contentLength was {expected}.',
  lengthExceeded: 'FileStore.put received more than the declared contentLength of {expected}.',
  alreadyStored: 'FileStore.put refuses to overwrite {key}, which is already stored.',
  rootNotOwned:
    'The import files directory {path} is a symbolic link or is not owned by the user Ghost runs as.',
  rootStillWritableByOthers:
    'The import files directory {path} stays writable by its group or by others; set adapters.import-files.FileStore.basePath to a private directory.',
};

const configSchema = z
  .object({
    basePath: z
      .string({ error: tpl(messages.invalidBasePath) })
      .min(1, { error: tpl(messages.invalidBasePath) })
      .optional(),
  })
  .nullish();

type FileStoreOptions = z.infer<typeof configSchema>;

// Filesystem errors are boundary values: only a string `code` on an object counts.
const errnoCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return undefined;
  }
  return typeof err.code === 'string' ? err.code : undefined;
};

/**
 * Local-disk store for import files. Files live under `basePath`, by default a
 * `ghost-import-files-<uid>` folder in the OS temp directory, which is where the
 * imports kept their temp files before this store existed; the user id in the
 * name keeps two Ghost installs running as different users apart. Directories are
 * `0700`, files `0600`, and a file is opened create-only so a key is never
 * overwritten; a write that fails part-way is removed. Nothing here expires
 * files: the import deletes them when it is done, as it always has.
 */
export default class FileStore extends ImportFileStoreBase {
  readonly basePath: string;
  private warnedAboutRoot = false;

  /**
   * Validate the options FileStore would be constructed with, without
   * instantiating it. Called by the adapter manager at boot and by the
   * constructor, so the two share one source of truth.
   */
  static validate(config: unknown): asserts config is FileStoreOptions {
    const result = configSchema.safeParse(config);
    if (!result.success) {
      throw new errors.IncorrectUsageError({
        message: [...new Set(result.error.issues.map((issue) => issue.message))].join('; '),
      });
    }
  }

  constructor(config: unknown) {
    super();

    FileStore.validate(config);
    // Recorded only: the directory is created on the first put, so a read-only
    // location breaks an import rather than boot.
    this.basePath = config?.basePath ?? path.join(os.tmpdir(), defaultFolderName());
  }

  async put(key: string, body: Buffer | Readable, options: PutOptions): Promise<StoredFile> {
    assertValidKey(key);
    if (!Buffer.isBuffer(body) && typeof options.contentLength !== 'number') {
      throw new errors.IncorrectUsageError({ message: tpl(messages.missingContentLength) });
    }

    const filePath = this.pathFor(key);
    let size = 0;
    let target: fs.WriteStream | undefined;

    // Outside the cleanup below on purpose: a root that is refused was never ours,
    // so nothing under it may be touched, not even to tidy up.
    await this.ensureRoot();

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });

      if (Buffer.isBuffer(body)) {
        await fs.writeFile(filePath, body, { mode: 0o600, flag: 'wx' });
        size = body.length;
      } else {
        // Opened before anything is read, so the file exists by the time any
        // failure reaches the cleanup below and an EEXIST surfaces first.
        target = await openForWriting(filePath);
        // Stop as soon as the stream sends more than it declared, rather than let a
        // lying stream fill the disk; the cleanup below removes the partial file.
        const expected = options.contentLength as number;
        const count = async function* (source: AsyncIterable<Buffer | string>) {
          for await (const chunk of source) {
            size += Buffer.byteLength(chunk);
            if (size > expected) {
              throw new errors.IncorrectUsageError({
                message: tpl(messages.lengthExceeded, { expected }),
              });
            }
            yield chunk;
          }
        };
        await pipeline(body, count, target);
        if (size !== options.contentLength) {
          throw new errors.IncorrectUsageError({
            message: tpl(messages.lengthMismatch, {
              received: size,
              expected: options.contentLength,
            }),
          });
        }
      }
    } catch (err) {
      // 'wx' failed because the key is already stored: that file is not ours to
      // remove. Anything else left a partial file of ours, or nothing at all.
      if (errnoCode(err) === 'EEXIST') {
        throw new errors.IncorrectUsageError({ message: tpl(messages.alreadyStored, { key }) });
      }
      // The stream is closed before the partial file goes, for the platforms that
      // refuse to unlink an open file.
      await closed(target);
      await fs.remove(filePath).catch(() => {});
      await this.prune(path.dirname(filePath));
      throw err;
    }

    return { size, contentType: options.contentType };
  }

  async get(key: string): Promise<Readable> {
    assertValidKey(key);
    const filePath = this.pathFor(key);

    // Checked up front so a missing file rejects here, as a typed error, rather
    // than as an 'error' event on a stream the caller has already been handed.
    if ((await this.statFile(filePath)) === null) {
      throw importFileNotFoundError(key);
    }

    return fs.createReadStream(filePath);
  }

  async head(key: string): Promise<StoredFile | null> {
    assertValidKey(key);
    const stat = await this.statFile(this.pathFor(key));
    if (stat === null) {
      return null;
    }

    return { size: stat.size, contentType: contentTypeFor(key) };
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    const filePath = this.pathFor(key);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Missing is fine. A key that names a directory of stored files is "not
      // there", as it is for get and head, so it is left alone rather than removed
      // as a tree: EISDIR on Linux, EPERM on macOS. EPERM on a regular file (an
      // immutable file, say) is a real failure and must not pass as a delete.
      const code = errnoCode(err);
      const isDirectory =
        (code === 'EISDIR' || code === 'EPERM') &&
        (await fs.stat(filePath).then(
          (stat) => stat.isDirectory(),
          () => false,
        ));
      if (code !== 'ENOENT' && !isDirectory) {
        throw err;
      }
    }
    await this.prune(path.dirname(filePath));
  }

  private pathFor(key: string): string {
    return path.join(this.basePath, ...key.split('/'));
  }

  // The root has a predictable name in a shared temp directory, so a directory
  // another local user planted there, or a link pointing elsewhere, must not be
  // written into. A root that is ours but open to others is closed rather than
  // refused, so an install that always worked keeps working; a filesystem that
  // cannot hold the change is reported once. With the root ours and closed,
  // nothing below it can be anyone else's, so the paths under it are safe to use
  // as paths. Owner and mode are POSIX ideas; Windows checks the link only.
  private async ensureRoot(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(this.basePath);
    const posix = typeof process.getuid === 'function';
    if (stat.isSymbolicLink() || (posix && stat.uid !== process.getuid!())) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.rootNotOwned, { path: this.basePath }),
      });
    }
    if (posix && (stat.mode & 0o022) !== 0) {
      await fs.chmod(this.basePath, 0o700).catch(() => {});
      if (((await fs.stat(this.basePath)).mode & 0o022) !== 0 && !this.warnedAboutRoot) {
        this.warnedAboutRoot = true;
        logging.warn(
          { event: { name: 'import-files.root_not_private' }, path: this.basePath },
          tpl(messages.rootStillWritableByOthers, { path: this.basePath }),
        );
      }
    }
  }

  // A regular file, or null. A key that names a directory of stored files, a path
  // through a stored file, or a name the filesystem cannot hold is "not there" as
  // far as the contract is concerned, as it is for the S3 store.
  private async statFile(filePath: string): Promise<fs.Stats | null> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile() ? stat : null;
    } catch (err) {
      const code = errnoCode(err);
      if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ENAMETOOLONG') {
        return null;
      }
      throw err;
    }
  }

  // Remove the import's own `<kind>/<importId>` directory once it is empty. The
  // `<kind>` directory above it is shared by every import of that kind and is
  // left in place, so no request can pull it out from under another's mkdir.
  private async prune(directory: string): Promise<void> {
    if (directory === this.basePath || !directory.startsWith(this.basePath)) {
      return;
    }
    try {
      await fs.rmdir(directory);
    } catch {
      // Not empty, or already gone: either way there is nothing to do.
    }
  }
}

// Resolves once the create-only open has succeeded, rejects with the open error
// (EEXIST for a stored key) otherwise.
function openForWriting(filePath: string): Promise<fs.WriteStream> {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath, { mode: 0o600, flags: 'wx' });
    stream.once('open', () => resolve(stream));
    stream.once('error', reject);
  });
}

function closed(stream: fs.WriteStream | undefined): Promise<void> {
  if (!stream || stream.closed) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    stream.once('close', () => resolve());
    stream.destroy();
  });
}

// One root per operating-system user, so two installs running as different users
// on one machine never meet in the shared temp directory. Windows temp
// directories are per user already.
function defaultFolderName(): string {
  return typeof process.getuid === 'function'
    ? `${DEFAULT_FOLDER}-${process.getuid()}`
    : DEFAULT_FOLDER;
}

function contentTypeFor(key: string): string {
  return CONTENT_TYPES_BY_EXTENSION[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}
