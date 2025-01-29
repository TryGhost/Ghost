// # Local File Base Storage module
// The (default) module for storing files using the local file system
const serveStatic = require('../../../shared/express').static;

const fs = require('fs-extra');
const path = require('path');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const constants = require('@tryghost/constants');
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
     * @param {Object} file
     * @param {String} [file.path] -- The original path of the file
     * @param {String} [file.name] -- The original name of the file
     * @param {Boolean} [file.keepOriginalName] -- If true, skip generating a new filename
     * @param {String} targetDir
     * @returns {Promise<String>}
     */
    async save(file, targetDir) {
        // The base implementation of `getTargetDir` returns the format this.storagePath/YYYY/MM, e.g. /content/images/2025/01
        const directory = targetDir || this.getTargetDir(this.storagePath);
        const originalFilePath = file.path;

        // If the `keepOriginalName` flag is set, don't generate a new filename
        // Otherwise, generate a unique secure filename, composed of a 16-character random hash and truncated to be under 255 bytes, e.g. image-a1b2c3d4e5f6g789.png
        let targetFilePath;
        if (file.keepOriginalName) {
            targetFilePath = path.join(directory, file.name);
        } else {
            targetFilePath = this.getUniqueSecureFilePath(file, directory);
        }

        try {
            await fs.mkdirs(directory);
            await fs.copy(originalFilePath, targetFilePath);
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
                path.relative(this.storagePath, targetFilePath))
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
     *
     * @param {String} url full url under which the stored content is served, result of save method
     * @returns {String} path under which the content is stored
     */
    urlToPath(url) {
        let filePath;

        const prefix = urlUtils.urlJoin('/',
            urlUtils.getSubdir(),
            this.staticFileURLPrefix
        );

        if (url.startsWith(this.staticFileUrl)) {
            // CASE: full path that includes the site url
            filePath = url.replace(this.staticFileUrl, '');
            filePath = path.join(this.storagePath, filePath);
        } else if (url.startsWith(prefix)) {
            // CASE: The result of the save method doesn't include the site url. So we need to handle this case.
            filePath = url.replace(prefix, '');
            filePath = path.join(this.storagePath, filePath);
        } else {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidUrlParameter, {url})
            });
        }

        return filePath;
    }

    exists(fileName, targetDir) {
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
                    maxAge: constants.ONE_YEAR_MS,
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
        const filePath = path.join(targetDir, fileName);
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
