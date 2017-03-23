'use strict';
// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var serveStatic = require('express').static,
    fs = require('fs-extra'),
    os = require('os'),
    path = require('path'),
    util = require('util'),
    Promise = require('bluebird'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    utils = require('../utils'),
    StorageBase = require('ghost-storage-base'),
    remove = Promise.promisify(fs.remove);

class LocalFileStore extends StorageBase {
    /**
     * Saves the image to storage (the file system)
     *
     * - image is the express image object
     * - returns a promise which ultimately returns the full url to the uploaded image
     * @param image
     * @param targetDir
     * @returns {*}
     */
    save(image, targetDir) {
        targetDir = targetDir || this.getTargetDir(config.getContentPath('images'));
        var targetFilename;

        return this.getUniqueFileName(this, image, targetDir).then(function (filename) {
            targetFilename = filename;
            return Promise.promisify(fs.mkdirs)(targetDir);
        }).then(function () {
            return Promise.promisify(fs.copy)(image.path, targetFilename);
        }).then(function () {
            // The src for the image must be in URI format, not a file system path, which in Windows uses \
            // For local file system storage can use relative path so add a slash
            var fullUrl = (
                utils.url.urlJoin('/', utils.url.getSubdir(),
                    utils.url.STATIC_IMAGE_URL_PREFIX,
                    path.relative(config.getContentPath('images'), targetFilename))
            ).replace(new RegExp('\\' + path.sep, 'g'), '/');

            return fullUrl;
        }).catch(function (e) {
            return Promise.reject(e);
        });
    }

    exists(filename) {
        return new Promise(function (resolve) {
            fs.stat(filename, function (err) {
                var exists = !err;
                resolve(exists);
            });
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
            return serveStatic(config.getContentPath('images'), {maxAge: utils.ONE_YEAR_MS, fallthrough: false})(req, res, function (err) {
                if (err) {
                    if (err.statusCode === 404) {
                        return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
                    }

                    return next(new errors.GhostError({err: err}));
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

        var targetPath = path.join(config.getContentPath('images'), options.path);

        return new Promise(function (resolve, reject) {
            fs.readFile(targetPath, function (err, bytes) {
                if (err) {
                    return reject(new errors.GhostError({
                        err: err,
                        message: 'Could not read image: ' + targetPath
                    }));
                }

                resolve(bytes);
            });
        });
    }
}

module.exports = LocalFileStore;
