// # Local File Base Storage module
// The (default) module for storing files using the local file system
const serveStatic = require('../../../shared/express').static;

const fs = require('fs-extra');
const path = require('path');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const StorageBase = require('ghost-storage-base');

const messages = {
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    cannotRead: 'Could not read file: {file}',
    invalidUrlParameter: `The URL "{url}" is not a valid URL for this site.`
};

class LocalStorageBase extends StorageBase {
    /**
     *
     * @param {Object} options
     * @param {String} options.storagePath
     * @param {String} options.siteUrl
     * @param {String} [options.staticFileURLPrefix]
     * @param {Object} [options.errorMessages]
     * @param {String} [options.errorMessages.notFound]
     * @param {String} [options.errorMessages.notFoundWithRef]
     * @param {String} [options.errorMessages.cannotRead]
     */
    constructor({storagePath, staticFileURLPrefix, siteUrl, errorMessages}) {
        super();

        this.storagePath = storagePath;
        this.staticFileURLPrefix = staticFileURLPrefix;
        this.siteUrl = siteUrl;
        this.staticFileUrl = `${siteUrl}${staticFileURLPrefix}`;
        this.errorMessages = errorMessages || messages;
    }

    /**
     * Saves the file to storage (the file system)
     * - returns a promise which ultimately returns the full url to the uploaded file
     *
     * @param {StorageBase.Image} file
     * @param {String} targetDir
     * @returns {Promise<String>}
     */
    async save(file, targetDir) {
        let targetFilename;

        // Supports relative paths (preferred) and absolute paths (legacy)
        // TODO: remove absolute path support once all callers pass relative paths
        if (targetDir && !targetDir.startsWith(this.storagePath)) {
            targetDir = path.join(this.storagePath, targetDir);
        }

        targetDir = targetDir || this.getTargetDir(this.storagePath);

        const filename = await this.getUniqueFileName(file, targetDir);

        targetFilename = filename;
        await fs.mkdirs(targetDir);

        try {
            await fs.copy(file.path, targetFilename);
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
                path.relative(this.storagePath, targetFilename))
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

        return fullUrl;
    }

    /**
     * Saves a buffer in the targetPath
     * @param {Buffer} buffer is an instance of Buffer
     * @param {String} targetPath relative path NOT including storage path to which the buffer should be written
     * @returns {Promise<String>} a URL to retrieve the data
     */
    async saveRaw(buffer, targetPath) {
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
     * @param {String} url full url under which the stored content is served, result of save method
     * @returns {String} relative path under which the content is stored
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

        return relativePath.replace(/^\//, '');
    }

    exists(fileName, targetDir) {
        // Supports relative paths (preferred) and absolute paths (legacy)
        // TODO: remove absolute path support once all callers pass relative paths
        if (targetDir && !targetDir.startsWith(this.storagePath)) {
            targetDir = path.join(this.storagePath, targetDir);
        }
        const filePath = path.join(targetDir || this.storagePath, fileName);

        return fs.stat(filePath)
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
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
     * @param {String} filePath
     * @returns {Promise.<*>}
     */
    async delete(fileName, targetDir) {
        // Supports relative paths (preferred) and absolute paths (legacy)
        // TODO: remove absolute path support once all callers pass relative paths
        if (targetDir && !targetDir.startsWith(this.storagePath)) {
            targetDir = path.join(this.storagePath, targetDir);
        }
        const filePath = path.join(targetDir || this.storagePath, fileName);
        return await fs.remove(filePath);
    }

    /**
     * Reads bytes from disk for a target file
     * - path of target file (without content path!)
     *
     * @param options
     */
    read(options) {
        options = options || {};

        // remove trailing slashes
        options.path = (options.path || '').replace(/\/$|\\$/, '');

        const targetPath = path.join(this.storagePath, options.path);

        return new Promise((resolve, reject) => {
            fs.readFile(targetPath, (err, bytes) => {
                if (err) {
                    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
                        return reject(new errors.NotFoundError({
                            err: err,
                            message: tpl(this.errorMessages.notFoundWithRef, {file: options.path})
                        }));
                    }

                    if (err.code === 'ENAMETOOLONG') {
                        return reject(new errors.BadRequestError({err: err}));
                    }

                    if (err.code === 'EACCES') {
                        return reject(new errors.NoPermissionError({err: err}));
                    }

                    return reject(new errors.InternalServerError({
                        err: err,
                        message: tpl(this.errorMessages.cannotRead, {file: options.path})
                    }));
                }

                resolve(bytes);
            });
        });
    }
}

module.exports = LocalStorageBase;
