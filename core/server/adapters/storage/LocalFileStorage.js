// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var serveStatic = require('express').static,
    fs = require('fs-extra'),
    path = require('path'),
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
            // The src for the image must be in URI format, not a file system path, which in Windows uses \
            // For local file system storage can use relative path so add a slash
            var fullUrl = (
                urlService.utils.urlJoin('/', urlService.utils.getSubdir(),
                    urlService.utils.STATIC_IMAGE_URL_PREFIX,
                    path.relative(self.storagePath, targetFilename))
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
}

module.exports = LocalFileStore;
