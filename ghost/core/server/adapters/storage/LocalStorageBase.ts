// # Local File Base Storage module
// The (default) module for storing files using the local file system
import fs from 'fs-extra';
import { open } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import os from 'os';
import path from 'path';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import { StorageBase, type ReadOptions, type StorageFile } from 'ghost-storage-base';
import urlUtils from '../../../shared/url-utils';
import { errify } from '../../../shared/errify';
import {
  readImportMetadata,
  type ImportStorageListOptions,
  type ImportStoragePage,
  type VersionedMetadata,
} from './import-storage';
// @ts-expect-error This module lacks type definitions.
import { serveStatic } from '../../../shared/express';

const messages = {
  notFound: 'File not found',
  notFoundWithRef: 'File not found: {file}',
  cannotRead: 'Could not read file: {file}',
  invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
  invalidPathParameter: 'The path "{path}" is not valid for this storage.',
};

const VERSION_DIRECTORY = '.ghost-import-versions';
const DELETED_DIRECTORY = '.ghost-import-deleted';

function hasCode(error: unknown, ...codes: string[]): boolean {
  return error instanceof Error && codes.includes((error as NodeJS.ErrnoException).code ?? '');
}

async function syncDirectory(directory: string): Promise<void> {
  const parent = await open(directory, 'r');
  try {
    await parent.sync();
  } finally {
    await parent.close();
  }
}

export interface LocalStorageBaseErrorMessages {
  notFound: string;
  notFoundWithRef: string;
  cannotRead: string;
}

export interface LocalStorageBaseOptions {
  // Unset, files go in the OS temp directory, which the imports store in defaults.json relies on.
  storagePath?: string;
  siteUrl?: string;
  staticFileURLPrefix?: string;
  errorMessages?: LocalStorageBaseErrorMessages;
}

/**
 * Errors thrown by `serve-static` carry an HTTP status alongside the standard
 * Error fields.
 */
interface ServeStaticError extends Error {
  statusCode?: number;
  path?: string;
}

class LocalStorageBase extends StorageBase {
  readonly staticFileURLPrefix: string | undefined;

  readonly siteUrl: string | undefined;

  readonly staticFileUrl: string;

  readonly errorMessages: LocalStorageBaseErrorMessages;

  constructor({
    storagePath,
    staticFileURLPrefix,
    siteUrl,
    errorMessages,
  }: LocalStorageBaseOptions) {
    super();

    this.storagePath = storagePath ?? os.tmpdir();
    this.staticFileURLPrefix = staticFileURLPrefix;
    this.siteUrl = siteUrl;
    this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
    this.errorMessages = errorMessages || messages;
  }

  /**
   * Normalizes a relative storage path and rejects traversal outside the storage root.
   */
  _normalizeStorageRelativePath(filePath?: string): string {
    const normalized = path.posix.normalize(
      String(filePath || '')
        .replaceAll('\\', '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, ''),
    );

    if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.invalidPathParameter, { path: filePath }),
      });
    }

    return normalized;
  }

  /**
   * Resolves a target directory and optional file name into a full path,
   * validating the result is inside the storage root.
   *
   * Supports relative paths (preferred) and absolute paths (legacy).
   * TODO: remove absolute path support once all callers pass relative paths
   *
   * @param targetDir absolute or relative directory
   * @param fileName file name to normalize and append
   * @param allowRoot whether storagePath itself is a valid result
   * @returns resolved absolute path inside storagePath, or storagePath when explicitly allowed
   */
  _resolveAndValidateStoragePath(targetDir?: string, fileName?: string, allowRoot = false): string {
    const resolvedRoot = path.resolve(this.storagePath);

    // Resolve targetDir: if already inside storage root use as-is, otherwise treat as relative
    let resolvedBase;
    if (targetDir) {
      const resolvedTargetDir = path.resolve(targetDir);
      const relToRoot = path.relative(resolvedRoot, resolvedTargetDir);
      if (relToRoot === '' || (!relToRoot.startsWith('..') && !path.isAbsolute(relToRoot))) {
        resolvedBase = resolvedTargetDir;
      } else {
        resolvedBase = path.resolve(this.storagePath, targetDir);
      }
    } else {
      resolvedBase = resolvedRoot;
    }

    // If fileName provided, normalize and resolve
    let resolvedPath;
    if (fileName) {
      const normalizedFileName = this._normalizeStorageRelativePath(fileName);
      resolvedPath = path.resolve(resolvedBase, normalizedFileName);
    } else {
      resolvedPath = resolvedBase;
    }

    // Validate the resolved path is inside the storage root. Callers which operate on files
    // keep the stricter default; save() may target the root because the generated filename is
    // validated separately before anything is written.
    const relative = path.relative(resolvedRoot, resolvedPath);
    if (
      (!allowRoot && relative === '') ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative)
    ) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.invalidPathParameter, { path: fileName || targetDir || '' }),
      });
    }

    return resolvedPath;
  }

  /**
   * Saves the file to storage (the file system)
   * - returns a promise which ultimately returns the full url to the uploaded file
   */
  async save(file: StorageFile, targetDir?: string): Promise<string> {
    targetDir = targetDir
      ? this._resolveAndValidateStoragePath(targetDir, undefined, true)
      : this.getTargetDir(this.storagePath);

    const targetFilename = await this.getUniqueFileName(file, targetDir);

    // Verify that we are saving directly under `targetDir` and not outside of it.
    const expectedPrefix = path.join(path.resolve(targetDir), '/');
    if (!path.resolve(targetFilename).startsWith(expectedPrefix)) {
      throw new errors.BadRequestError({ message: 'Cannot save to the given filename' });
    }

    await fs.mkdirs(targetDir);

    try {
      await fs.copy(file.path, targetFilename);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENAMETOOLONG') {
        throw new errors.BadRequestError({ err: errify(err) });
      }

      throw err;
    }

    // The src for the image must be in URI format, not a file system path, which in Windows uses \
    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin(
        '/',
        urlUtils.getSubdir(),
        this.staticFileURLPrefix as string,
        path.relative(this.storagePath, targetFilename),
      )
      .replace(new RegExp(`\\${path.sep}`, 'g'), '/');

    return fullUrl;
  }

  /**
   * Saves a buffer in the targetPath
   *
   * @param buffer is an instance of Buffer
   * @param targetPath relative path NOT including storage path to which the buffer should be written
   * @returns a URL to retrieve the data
   */
  async saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
    const storagePath = path.join(this.storagePath, this._normalizeStorageRelativePath(targetPath));
    const targetDir = path.dirname(storagePath);

    await fs.mkdirs(targetDir);
    await fs.writeFile(storagePath, buffer);

    // For local file system storage can use relative path so add a slash
    const fullUrl = urlUtils
      .urlJoin('/', urlUtils.getSubdir(), this.staticFileURLPrefix as string, targetPath)
      .replace(new RegExp(`\\${path.sep}`, 'g'), '/');

    return fullUrl;
  }

  /**
   * @param url full url under which the stored content is served, result of save method
   * @returns relative path under which the content is stored
   */
  urlToPath(url: string): string {
    let relativePath;

    const prefix = urlUtils.urlJoin('/', urlUtils.getSubdir(), this.staticFileURLPrefix as string);

    if (url.startsWith(this.staticFileUrl)) {
      // CASE: full path that includes the site url
      relativePath = url.replace(this.staticFileUrl, '');
    } else if (url.startsWith(prefix)) {
      // CASE: The result of the save method doesn't include the site url. So we need to handle this case.
      relativePath = url.replace(prefix, '');
    } else {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.invalidUrlParameter, { url }),
      });
    }

    try {
      return this._normalizeStorageRelativePath(relativePath);
    } catch (err) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.invalidUrlParameter, { url }),
      });
    }
  }

  async exists(fileName: string, targetDir?: string): Promise<boolean> {
    let filePath;

    try {
      filePath = this._resolveAndValidateStoragePath(targetDir, fileName);
    } catch (err) {
      if (err instanceof errors.IncorrectUsageError) {
        return false;
      }

      throw err;
    }

    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets response headers for a file about to be served from local storage.
   * `send` only derives Content-Type from the extension when it hasn't been
   * set yet, so subclasses can override this to enforce their own type.
   *
   * `nosniff` stops browsers from second-guessing the declared Content-Type
   * based on the file's contents.
   */
  setServeHeaders(res: Response, _filePath: string): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  /**
   * For some reason send divides the max age number by 1000
   * Fallthrough: false ensures that if an image isn't found, it automatically 404s
   * Wrap server static errors
   */
  serve(): RequestHandler {
    const { storagePath, errorMessages } = this;
    const setHeaders = (res: Response, filePath: string) => this.setServeHeaders(res, filePath);

    return function serveStaticContent(req: Request, res: Response, next: NextFunction) {
      return serveStatic(storagePath, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in ms
        fallthrough: false,
        setHeaders,
      })(req, res, (err?: ServeStaticError) => {
        if (err) {
          if (err.statusCode === 404) {
            return next(
              new errors.NotFoundError({
                message: tpl(errorMessages.notFound),
                code: 'STATIC_FILE_NOT_FOUND',
                property: err.path,
              }),
            );
          }

          if (err.statusCode === 400) {
            return next(new errors.BadRequestError({ err: err }));
          }

          if (err.statusCode === 403) {
            return next(new errors.NoPermissionError({ err: err }));
          }

          if (err.name === 'RangeNotSatisfiableError') {
            return next(new errors.RangeNotSatisfiableError({ err }));
          }

          return next(new errors.InternalServerError({ err: err }));
        }

        next();
      });
    };
  }

  async delete(fileName: string, targetDir?: string): Promise<void> {
    const filePath = this._resolveAndValidateStoragePath(targetDir, fileName);
    return await fs.remove(filePath);
  }

  async writeStream(key: string, source: Readable): Promise<void> {
    const normalized = this._normalizeStorageRelativePath(key);
    const target = this._resolveAndValidateStoragePath(undefined, normalized);
    await this.writeImportFile(target, source, fs.rename, true);
  }

  private async writeImportFile(
    target: string,
    source: Readable,
    publish: (temporary: string, target: string) => Promise<void>,
    createDirectory = false,
  ): Promise<void> {
    const directory = path.dirname(target);
    const temporary = path.join(directory, `.write-${randomUUID()}`);

    // A file stream may fail while mkdir is pending, before pipeline attaches.
    const awaitDestination = () => {};
    source.on('error', awaitDestination);
    try {
      if (createDirectory) {
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      }
      await pipeline(source, fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));

      const file = await open(temporary, 'r+');
      try {
        await file.sync();
      } finally {
        await file.close();
      }
      await publish(temporary, target);
      await syncDirectory(directory);
    } catch (error) {
      source.destroy();
      throw error;
    } finally {
      source.off('error', awaitDestination);
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }

  replaceMetadata(key: string, bytes: Buffer): Promise<void> {
    return this.writeStream(key, Readable.from([bytes]));
  }

  private versionDirectory(key: string): string {
    const normalized = this._normalizeStorageRelativePath(key);
    return this._resolveAndValidateStoragePath(undefined, normalized + VERSION_DIRECTORY);
  }

  private async latestVersion(directory: string): Promise<number> {
    const names = await fs.readdir(directory);
    return names.reduce(
      (latest, name) => (/^[1-9]\d*$/.test(name) ? Math.max(latest, +name) : latest),
      0,
    );
  }

  async readVersionedMetadata(key: string): Promise<VersionedMetadata | undefined> {
    const directory = this.versionDirectory(key);
    try {
      const version = String(await this.latestVersion(directory));
      const bytes = await readImportMetadata(fs.createReadStream(path.join(directory, version)));
      return { bytes, version };
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) {
        throw error;
      }
    }
  }

  async writeVersionedMetadata(
    key: string,
    bytes: Buffer,
    version: string | null,
  ): Promise<boolean> {
    const directory = this.versionDirectory(key);
    try {
      if (version === null) {
        // Publish the first revision and its directory together so readers
        // never see an empty directory. An existing directory is non-empty.
        const parent = path.dirname(directory);
        await fs.mkdir(parent, { recursive: true, mode: 0o700 });
        const pending = await fs.mkdtemp(path.join(parent, '.metadata-'));
        try {
          await this.writeImportFile(path.join(pending, '1'), Readable.from([bytes]), fs.rename);
          await fs.rename(pending, directory);
          await syncDirectory(parent);
        } finally {
          await fs.rm(pending, { recursive: true, force: true });
        }
      } else {
        const latest = await this.latestVersion(directory);
        if (version !== String(latest)) {
          return false;
        }
        // A hard link publishes a complete revision only if its name is free.
        // A crashed writer holds no lock and leaves the current revision readable.
        await this.writeImportFile(
          path.join(directory, String(latest + 1)),
          Readable.from([bytes]),
          fs.link,
        );
      }
      return true;
    } catch (error) {
      if (hasCode(error, 'EEXIST', 'ENOTEMPTY', 'ENOENT')) {
        return false;
      }
      throw error;
    }
  }

  async deleteVersionedMetadata(key: string): Promise<void> {
    const directory = this.versionDirectory(key);
    const deleted = directory.slice(0, -VERSION_DIRECTORY.length) + DELETED_DIRECTORY;
    try {
      // Detach all revisions together. A stale writer cannot recreate a
      // revision after deletion, and cleanup can retry a detached directory.
      await fs.rename(directory, deleted);
      await syncDirectory(path.dirname(directory));
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) {
        throw error;
      }
    }
    await fs.rm(deleted, { recursive: true, force: true });
  }

  async listPrefix(
    prefix: string,
    { cursor, limit = 1000 }: ImportStorageListOptions = {},
  ): Promise<ImportStoragePage> {
    const normalized = this._normalizeStorageRelativePath(prefix);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new errors.IncorrectUsageError({ message: 'Invalid import storage page size.' });
    }
    const directory = this._resolveAndValidateStoragePath(undefined, normalized);
    const keys: string[] = [];
    for await (const key of this.listDirectory(directory, `${normalized}/`, cursor)) {
      if (keys.length === limit) {
        return { keys, cursor: keys[keys.length - 1] };
      }
      keys.push(key);
    }
    return { keys };
  }

  private async *listDirectory(
    directory: string,
    prefix: string,
    cursor?: string,
  ): AsyncGenerator<string> {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    });
    const ordered = entries
      .filter((entry) => !entry.isDirectory() || !entry.name.startsWith('.metadata-'))
      .map((entry) => {
        const versionDirectory =
          entry.isDirectory() &&
          [VERSION_DIRECTORY, DELETED_DIRECTORY].find((suffix) => entry.name.endsWith(suffix));
        const name = versionDirectory ? entry.name.slice(0, -versionDirectory.length) : entry.name;
        return {
          entry,
          key: prefix + name + (entry.isDirectory() && !versionDirectory ? '/' : ''),
          versionDirectory,
        };
      })
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    for (const { entry, key, versionDirectory } of ordered) {
      if (entry.isDirectory() && !versionDirectory) {
        if (!cursor || key > cursor || cursor.startsWith(key)) {
          yield* this.listDirectory(path.join(directory, entry.name), key, cursor);
        }
      } else if ((entry.isFile() || versionDirectory) && (!cursor || key > cursor)) {
        yield key;
      }
    }
  }

  async readStream(options: Partial<ReadOptions> = {}): Promise<Readable> {
    const normalizedPath = this._normalizeStorageRelativePath(options.path);
    try {
      const file = await open(path.join(this.storagePath, normalizedPath), 'r');
      return file.createReadStream();
    } catch (error) {
      throw this.readError(error, options.path);
    }
  }

  /**
   * Reads bytes from disk for a target file
   * - path of target file (without content path!)
   */
  async read(options?: Partial<ReadOptions>): Promise<Buffer> {
    options = options || {};

    const normalizedPath = this._normalizeStorageRelativePath(options.path);
    const targetPath = path.join(this.storagePath, normalizedPath);

    try {
      return await fs.readFile(targetPath);
    } catch (rawError) {
      throw this.readError(rawError, options.path);
    }
  }

  private readError(rawError: unknown, filePath?: string): Error {
    const err = errify(rawError);
    const code = (rawError as NodeJS.ErrnoException).code;

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return new errors.NotFoundError({
        err: err,
        message: tpl(this.errorMessages.notFoundWithRef, { file: filePath }),
      });
    }

    if (code === 'ENAMETOOLONG') {
      return new errors.BadRequestError({ err: err });
    }

    if (code === 'EACCES') {
      return new errors.NoPermissionError({ err: err });
    }

    return new errors.InternalServerError({
      err: err,
      message: tpl(this.errorMessages.cannotRead, { file: filePath }),
    });
  }
}

export default LocalStorageBase;
