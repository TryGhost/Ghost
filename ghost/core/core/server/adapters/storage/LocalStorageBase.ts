// # Local File Base Storage module
// The (default) module for storing files using the local file system
import fs from 'fs-extra';
import path from 'path';
import type {NextFunction, Request, RequestHandler, Response} from 'express';
import type express from 'express';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import {StorageBase, type ReadOptions, type StorageFile} from 'ghost-storage-base';
import urlUtils from '../../../shared/url-utils';
import {errify} from '../../../shared/errify';

const serveStatic: typeof express.static = require('../../../shared/express').static;

const messages = {
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    cannotRead: 'Could not read file: {file}',
    invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
    invalidPathParameter: 'The path "{path}" is not valid for this storage.'
};

export interface LocalStorageBaseErrorMessages {
    notFound: string;
    notFoundWithRef: string;
    cannotRead: string;
}

export interface LocalStorageBaseOptions {
    storagePath: string;
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

    constructor({storagePath, staticFileURLPrefix, siteUrl, errorMessages}: LocalStorageBaseOptions) {
        super();

        this.storagePath = storagePath;
        this.staticFileURLPrefix = staticFileURLPrefix;
        this.siteUrl = siteUrl;
        this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
        this.errorMessages = errorMessages || messages;
    }

    /**
     * Normalizes a relative storage path and rejects traversal outside the storage root.
     */
    _normalizeStorageRelativePath(filePath?: string): string {
        const normalized = path.posix.normalize(String(filePath || '')
            .replaceAll('\\', '/')
            .replace(/^\/+/, '')
            .replace(/\/+$/, ''));

        if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidPathParameter, {path: filePath})
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
     * @returns resolved absolute path inside storagePath
     */
    _resolveAndValidateStoragePath(targetDir?: string, fileName?: string): string {
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

        // Validate the resolved path is strictly inside the storage root (not equal to it)
        const relative = path.relative(resolvedRoot, resolvedPath);
        if (relative === '' || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidPathParameter, {path: fileName || targetDir || ''})
            });
        }

        return resolvedPath;
    }

    /**
     * Saves the file to storage (the file system)
     * - returns a promise which ultimately returns the full url to the uploaded file
     */
    async save(file: StorageFile, targetDir?: string): Promise<string> {
        let targetFilename;

        targetDir = targetDir
            ? this._resolveAndValidateStoragePath(targetDir)
            : this.getTargetDir(this.storagePath);

        const filename = await this.getUniqueFileName(file, targetDir);

        targetFilename = filename;
        await fs.mkdirs(targetDir);

        try {
            await fs.copy(file.path, targetFilename);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENAMETOOLONG') {
                throw new errors.BadRequestError({err: errify(err)});
            }

            throw err;
        }

        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        const fullUrl = (
            urlUtils.urlJoin('/',
                urlUtils.getSubdir(),
                this.staticFileURLPrefix as string,
                path.relative(this.storagePath, targetFilename))
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

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
        const fullUrl = (
            urlUtils.urlJoin('/', urlUtils.getSubdir(),
                this.staticFileURLPrefix as string,
                targetPath)
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

        return fullUrl;
    }

    /**
     * @param url full url under which the stored content is served, result of save method
     * @returns relative path under which the content is stored
     */
    urlToPath(url: string): string {
        let relativePath;

        const prefix = urlUtils.urlJoin('/',
            urlUtils.getSubdir(),
            this.staticFileURLPrefix as string
        );

        if (url.startsWith(this.staticFileUrl)) {
            // CASE: full path that includes the site url
            relativePath = url.replace(this.staticFileUrl, '');
        } else if (url.startsWith(prefix)) {
            // CASE: The result of the save method doesn't include the site url. So we need to handle this case.
            relativePath = url.replace(prefix, '');
        } else {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
            });
        }

        try {
            return this._normalizeStorageRelativePath(relativePath);
        } catch (err) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
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
     * For some reason send divides the max age number by 1000
     * Fallthrough: false ensures that if an image isn't found, it automatically 404s
     * Wrap server static errors
     */
    serve(): RequestHandler {
        const {storagePath, errorMessages} = this;

        return function serveStaticContent(req: Request, res: Response, next: NextFunction) {
            return serveStatic(
                storagePath,
                {
                    maxAge: (365 * 24 * 60 * 60 * 1000), // 1 year in ms
                    fallthrough: false
                }
            )(req, res, (err?: ServeStaticError) => {
                if (err) {
                    if (err.statusCode === 404) {
                        return next(new errors.NotFoundError({
                            message: tpl(errorMessages.notFound),
                            code: 'STATIC_FILE_NOT_FOUND',
                            property: err.path
                        }));
                    }

                    if (err.statusCode === 400) {
                        return next(new errors.BadRequestError({err: err}));
                    }

                    if (err.statusCode === 403) {
                        return next(new errors.NoPermissionError({err: err}));
                    }

                    if (err.name === 'RangeNotSatisfiableError') {
                        return next(new errors.RangeNotSatisfiableError({err}));
                    }

                    return next(new errors.InternalServerError({err: err}));
                }

                next();
            });
        };
    }

    async delete(fileName: string, targetDir?: string): Promise<void> {
        const filePath = this._resolveAndValidateStoragePath(targetDir, fileName);
        return await fs.remove(filePath);
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
            const err = errify(rawError);
            const code = (rawError as NodeJS.ErrnoException).code;

            if (code === 'ENOENT' || code === 'ENOTDIR') {
                throw new errors.NotFoundError({
                    err: err,
                    message: tpl(this.errorMessages.notFoundWithRef, {file: options.path})
                });
            }

            if (code === 'ENAMETOOLONG') {
                throw new errors.BadRequestError({err: err});
            }

            if (code === 'EACCES') {
                throw new errors.NoPermissionError({err: err});
            }

            throw new errors.InternalServerError({
                err: err,
                message: tpl(this.errorMessages.cannotRead, {file: options.path})
            });
        }
    }
}

export default LocalStorageBase;
