// # Local File Base Storage module
// The (default) module for storing files using the local file system
const serveStatic = require('../../../shared/express').static;

const fs = require('fs-extra');
const path = require('path');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const StorageBase = require('ghost-storage-base');
const {assertCanonicalFilePath, assertCanonicalDirPath} = require('./utils');

const messages = {
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    cannotRead: 'Could not read file: {file}',
    invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`,
    invalidPathParameter: 'The path "{path}" is not valid for this storage.'
};

class LocalStorageBase extends StorageBase {
    /**
     *
     * @param {Object} options
     * @param {string} options.storagePath
     * @param {string} options.siteUrl
     * @param {string} [options.staticFileURLPrefix]
     * @param {Object} [options.errorMessages]
     * @param {string} [options.errorMessages.notFound]
     * @param {string} [options.errorMessages.notFoundWithRef]
     * @param {string} [options.errorMessages.cannotRead]
     */
    constructor({storagePath, staticFileURLPrefix, siteUrl, errorMessages}) {
        super();

        this.storagePath = storagePath;
        this.staticFileURLPrefix = staticFileURLPrefix;
        this.siteUrl = siteUrl;
        this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
        this.errorMessages = errorMessages || messages;

        // Bind the path validators to this instance's storagePath so call
        // sites don't have to repeat it on every assertion.
        this._assertFilePath = input => assertCanonicalFilePath(input, this.storagePath);
        this._assertDirPath = input => assertCanonicalDirPath(input, this.storagePath);
    }

    /**
     * Resolve a relative-to-storage path or path pair into a full filesystem
     * path inside the storage root. Inputs must already be canonical
     * (validated at the public entry points); this just composes the on-disk
     * path.
     *
     * @param {string} [targetDir]
     * @param {string} [fileName]
     * @returns {string}
     */
    _resolveStoragePath(targetDir, fileName) {
        const segments = [this.storagePath];
        if (targetDir) {
            segments.push(targetDir);
        }
        if (fileName) {
            segments.push(fileName);
        }
        return path.join(...segments);
    }

    /**
     * Saves the file to storage (the file system)
     * - returns a promise which ultimately returns the full url to the uploaded file
     *
     * @param {StorageBase.Image} file
     * @param {string} targetDir
     * @returns {Promise<String>}
     */
    async save(file, targetDir) {
        if (targetDir !== undefined) {
            this._assertDirPath(targetDir);
        }
        // Keep the dir relative through generateUnique/exists so the strict
        // validator sees canonical inputs. Only resolve to absolute when we
        // actually touch the filesystem. Distinguish "no targetDir" (year/month
        // default) from explicit empty string (storage root).
        const relativeDir = targetDir !== undefined ? targetDir : this.getTargetDir();
        const relativeFilePath = await this.getUniqueFileName(file, relativeDir);

        const absoluteFilePath = path.join(this.storagePath, relativeFilePath);
        await fs.mkdirs(path.dirname(absoluteFilePath));

        try {
            await fs.copy(file.path, absoluteFilePath);
        } catch (err) {
            if (err.code === 'ENAMETOOLONG') {
                throw new errors.BadRequestError({err});
            }

            throw err;
        }

        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        const fullUrl = (
            urlUtils.urlJoin('/',
                urlUtils.getSubdir(),
                this.staticFileURLPrefix,
                relativeFilePath)
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

        return fullUrl;
    }

    /**
     * Saves a buffer in the targetPath
     * @param {Buffer} buffer is an instance of Buffer
     * @param {string} targetPath relative path NOT including storage path to which the buffer should be written
     * @returns {Promise<String>} a URL to retrieve the data
     */
    async saveRaw(buffer, targetPath) {
        this._assertFilePath(targetPath);

        const storagePath = path.join(this.storagePath, targetPath);
        const targetDir = path.dirname(storagePath);

        await fs.mkdirs(targetDir);
        await fs.writeFile(storagePath, buffer);

        // For local file system storage can use relative path so add a slash
        const fullUrl = (
            urlUtils.urlJoin('/', urlUtils.getSubdir(),
                this.staticFileURLPrefix,
                targetPath)
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

        return fullUrl;
    }

    /**
     * @param {string} url full url under which the stored content is served, result of save method
     * @returns {string} relative path under which the content is stored
     */
    urlToPath(url) {
        let relativePath;

        const prefix = urlUtils.urlJoin('/',
            urlUtils.getSubdir(),
            this.staticFileURLPrefix
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

        // Strip any leading/trailing slashes and normalise `..` segments before
        // returning a canonical relative path.
        const normalized = path.posix.normalize(relativePath
            .replaceAll('\\', '/')
            .replace(/^\/+/, '')
            .replace(/\/+$/, ''));

        if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
            });
        }

        return normalized;
    }

    async exists(fileName, targetDir) {
        // exists() is a query, not a mutation: a malformed input is "no, that
        // doesn't exist" rather than a programmer-error throw. Mutating methods
        // (save/saveRaw/delete) still throw on the same validator failures.
        try {
            this._assertFilePath(fileName);
            if (targetDir !== undefined) {
                this._assertDirPath(targetDir);
            }
        } catch (err) {
            if (err instanceof errors.IncorrectUsageError) {
                return false;
            }
            throw err;
        }

        const filePath = this._resolveStoragePath(targetDir, fileName);

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
     *
     * @returns {serveStaticContent}
     */
    serve() {
        const {storagePath, errorMessages} = this;

        return function serveStaticContent(req, res, next) {
            return serveStatic(
                storagePath,
                {
                    maxAge: (365 * 24 * 60 * 60 * 1000), // 1 year in ms
                    fallthrough: false
                }
            )(req, res, (err) => {
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

    /**
     * @param {string} filePath
     * @returns {Promise.<*>}
     */
    async delete(fileName, targetDir) {
        this._assertFilePath(fileName);
        if (targetDir !== undefined) {
            this._assertDirPath(targetDir);
        }

        const filePath = this._resolveStoragePath(targetDir, fileName);
        return await fs.remove(filePath);
    }

    /**
     * Reads bytes from disk for a target file
     * - path of target file (without content path!)
     *
     * @param options
     */
    async read(options) {
        options = options || {};

        this._assertFilePath(options.path);
        const targetPath = path.join(this.storagePath, options.path);

        try {
            return await fs.readFile(targetPath);
        } catch (err) {
            if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
                throw new errors.NotFoundError({
                    err: err,
                    message: tpl(this.errorMessages.notFoundWithRef, {file: options.path})
                });
            }

            if (err.code === 'ENAMETOOLONG') {
                throw new errors.BadRequestError({err: err});
            }

            if (err.code === 'EACCES') {
                throw new errors.NoPermissionError({err: err});
            }

            throw new errors.InternalServerError({
                err: err,
                message: tpl(this.errorMessages.cannotRead, {file: options.path})
            });
        }
    }
}

module.exports = LocalStorageBase;
