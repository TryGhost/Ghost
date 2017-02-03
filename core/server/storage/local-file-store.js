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
    BaseStore = require('./base'),
    remove = Promise.promisify(fs.remove);

function LocalFileStore() {
    BaseStore.call(this);
}

util.inherits(LocalFileStore, BaseStore);

// ### Save
// Saves the image to storage (the file system)
// - image is the express image object
// - returns a promise which ultimately returns the full url to the uploaded image
LocalFileStore.prototype.save = function save(image, targetDir) {
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
};

LocalFileStore.prototype.exists = function exists(filename) {
    return new Promise(function (resolve) {
        fs.stat(filename, function (err) {
            var exists = !err;
            resolve(exists);
        });
    });
};

// middleware for serving the files
LocalFileStore.prototype.serve = function serve(options) {
    options = options || {};

    // CASE: serve themes
    // serveStatic can't be used to serve themes, because
    // download files depending on the route (see `send` npm module)
    if (options.isTheme) {
        return function downloadTheme(req, res, next) {
            var themeName = options.name,
                themePath = path.join(config.getContentPath('themes'), themeName),
                zipName = themeName + '.zip',
                // store this in a unique temporary folder
                zipBasePath = path.join(os.tmpdir(), utils.uid(10)),
                zipPath = path.join(zipBasePath, zipName),
                stream;

            Promise.promisify(fs.ensureDir)(zipBasePath)
                .then(function () {
                    return Promise.promisify(utils.zipFolder)(themePath, zipPath);
                })
                .then(function (length) {
                    res.set({
                        'Content-disposition': 'attachment; filename={themeName}.zip'.replace('{themeName}', themeName),
                        'Content-Type': 'application/zip',
                        'Content-Length': length
                    });

                    stream = fs.createReadStream(zipPath);
                    stream.pipe(res);
                })
                .catch(function (err) {
                    next(err);
                })
                .finally(function () {
                    remove(zipBasePath);
                });
        };
    } else {
        // CASE: serve images
        // For some reason send divides the max age number by 1000
        // Fallthrough: false ensures that if an image isn't found, it automatically 404s
        // Wrap server static errors
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
};

LocalFileStore.prototype.delete = function deleteFile(fileName, targetDir) {
    targetDir = targetDir || this.getTargetDir(config.getContentPath('images'));

    var pathToDelete = path.join(targetDir, fileName);
    return remove(pathToDelete);
};

/**
 * Reads bytes from disk for a target image
 * path: path of target image (without content path!)
 */
LocalFileStore.prototype.read = function read(options) {
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
};

module.exports = LocalFileStore;
