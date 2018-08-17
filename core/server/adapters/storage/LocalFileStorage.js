// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var serveStatic = require('express').static,
    fs = require('fs-extra'),
    path = require('path'),
    sharp = require('sharp'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require('../../config'),
    common = require('../../lib/common'),
    constants = require('../../lib/constants'),
    urlService = require('../../services/url'),
    StorageBase = require('ghost-storage-base');

class LocalFileStore extends StorageBase {
    constructor() {
        super();

        this.storagePath = config.getContentPath('images');
        this.resizerSettings = config.get('resizer');
    }

    /**
     * Saves the image to storage (the file system)
     * - image is the express image object
     * - returns a promise which ultimately returns the full url to the uploaded image
     *
     * @param image
     * @param targetDir
     * @returns {*}
     */
    save(image, targetDir) {
        var targetFilename,
            self = this;

        // NOTE: the base implementation of `getTargetDir` returns the format this.storagePath/YYYY/MM
        targetDir = targetDir || this.getTargetDir(this.storagePath);

        return this.getUniqueFileName(image, targetDir).then(function (filename) {
            targetFilename = filename;
            return fs.mkdirs(targetDir);
        }).then(function () {
            return fs.copy(image.path, targetFilename);
        }).then(function () {
            return self.resizeImage(image, targetFilename);
        }).then(function () {
            // The src for the image must be in URI format, not a file system path, which in Windows uses \
            // For local file system storage can use relative path so add a slash
            var fullUrl = (
                urlService.utils.urlJoin('/', urlService.utils.getSubdir(),
                    urlService.utils.STATIC_IMAGE_URL_PREFIX,
                    path.relative(self.storagePath, self.getDefaultImageFilename(image, targetFilename)))
            ).replace(new RegExp('\\' + path.sep, 'g'), '/');

            return fullUrl;
        }).catch(function (e) {
            return Promise.reject(e);
        });
    }

    exists(fileName, targetDir) {
        var filePath = path.join(targetDir || this.storagePath, fileName);

        return fs.stat(filePath)
            .then(function () {
                return true;
            })
            .catch(function () {
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
        var self = this;

        return function serveStaticContent(req, res, next) {
            var startedAtMoment = moment();

            return serveStatic(
                self.storagePath,
                {
                    maxAge: constants.ONE_YEAR_MS,
                    fallthrough: false,
                    onEnd: function onEnd() {
                        common.logging.info('LocalFileStorage.serve', req.path, moment().diff(startedAtMoment, 'ms') + 'ms');
                    }
                }
            )(req, res, function (err) {
                if (err) {
                    if (err.statusCode === 404) {
                        return next(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.errors.imageNotFound'),
                            code: 'STATIC_FILE_NOT_FOUND',
                            property: err.path
                        }));
                    }

                    return next(new common.errors.GhostError({err: err}));
                }

                next();
            });
        };
    }

    /**
     * Not implemented.
     * @returns {Promise.<*>}
     */
    delete() {
        return Promise.reject('not implemented');
    }

    /**
     * Reads bytes from disk for a target image
     * - path of target image (without content path!)
     *
     * @param options
     */
    read(options) {
        options = options || {};

        // remove trailing slashes
        options.path = (options.path || '').replace(/\/$|\\$/, '');

        var targetPath = path.join(this.storagePath, options.path);

        return new Promise(function (resolve, reject) {
            fs.readFile(targetPath, function (err, bytes) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        return reject(new common.errors.NotFoundError({
                            err: err,
                            message: common.i18n.t('errors.errors.imageNotFoundWithRef', {img: options.path})
                        }));
                    }

                    return reject(new common.errors.GhostError({
                        err: err,
                        message: common.i18n.t('errors.errors.cannotReadImage', {img: options.path})
                    }));
                }

                resolve(bytes);
            });
        });
    }

    /**
     * Given a filename, parse it into name and type (extension)
     * - filename is string
     * - returns an object composed by 2 strings: type and name
     *
     * @param filename
     * @returns {*}
     */
    getParsedFilename(filename) {
        let filenamePartials = filename.split('.');
        return {
            type: filenamePartials.pop(),
            name: filenamePartials.join('.')
        };
    }

    /**
     * If an image is given and resizer is enabled, then return the correct
     * target filename for the image according to resizer settings
     * - fileData is the express image object
     * - targetFilename is a string of the original proposed unique target filename
     * - returns a string
     *
     * @param fileData
     * @param targetFilename
     * @returns '*'
     */
    getDefaultImageFilename(fileData, targetFilename) {
        let parsedTargetFile = this.getParsedFilename(targetFilename);

        if (!this.isImage(fileData)) {
            return targetFilename;
        }
        if (!this.resizerSettings || !this.resizerSettings.enabled || !this.resizerSettings.defaultSize) {
            return targetFilename;
        }
        if (typeof this.resizerSettings.sizes !== 'object' || !this.resizerSettings.sizes.hasOwnProperty(this.resizerSettings.defaultSize)) {
            return targetFilename;
        }

        return parsedTargetFile.name + this.resizerSettings.glue + this.resizerSettings.defaultSize + '.' + parsedTargetFile.type;
    }

    /**
     * Verify if the file is image
     * - fileData is the express image object
     * - returns a boolean
     *
     * @param fileData
     * @returns true/false
     */
    isImage(fileData) {
        return (/\.(bmp|gif|jpg|jpeg|tiff|png|svg)$/i).test(fileData.originalname);
    }

    /**
     * Build all the resied "copies" of the given image
     * - fileData is the express image object
     * - targetFilename is a string of the original proposed unique target filename
     * - returns a promise which ultimately returns the full url to the uploaded image
     *
     * @param fileData
     * @param targetFilename
     * @returns {*}
     */
    resizeImage(fileData, targetFilename) {
        let resizingTasks = [],
            parsedTargetFile = this.getParsedFilename(targetFilename),
            sizes;

        // if the file is not an image, image settings
        // are missing or image resizer is disabled
        // do not attempt to resize the file
        if (!this.isImage(fileData) || !this.resizerSettings || !this.resizerSettings.enabled || typeof this.resizerSettings.sizes !== 'object') {
            return Promise.all(resizingTasks);
        }

        sizes = this.resizerSettings.sizes;
        for (let size in sizes) {
            if (typeof sizes[size] === 'object' && sizes[size].width && typeof sizes[size].width === 'number' && sizes[size].height && typeof sizes[size].height === 'number') {
                resizingTasks.push(
                    sharp(fileData.path)
                        .resize(sizes[size].width, sizes[size].height)
                        .toFile(parsedTargetFile.name + this.resizerSettings.glue + size + '.' + parsedTargetFile.type)
                );
            }
        }
        return Promise.all(resizingTasks);
    }
}

module.exports = LocalFileStore;
