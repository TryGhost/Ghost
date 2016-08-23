// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var serveStatic = require('express').static,
    fs = require('fs-extra'),
    path = require('path'),
    util = require('util'),
    Promise = require('bluebird'),
    execFileAsPromise = Promise.promisify(require('child_process').execFile),
    errors = require('../errors'),
    config = require('../config'),
    utils = require('../utils'),
    BaseStore = require('./base');

function LocalFileStore() {
    BaseStore.call(this);
}

util.inherits(LocalFileStore, BaseStore);

// ### Save
// Saves the image to storage (the file system)
// - image is the express image object
// - returns a promise which ultimately returns the full url to the uploaded image
LocalFileStore.prototype.save = function (image, targetDir) {
    targetDir = targetDir || this.getTargetDir(config.paths.imagesPath);
    var targetFilename;

    return this.getUniqueFileName(this, image, targetDir).then(function (filename) {
        targetFilename = filename;
        return Promise.promisify(fs.mkdirs)(targetDir);
    }).then(function () {
        return Promise.promisify(fs.copy)(image.path, targetFilename);
    }).then(function () {
        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        var fullUrl = (config.paths.subdir + '/' + config.paths.imagesRelPath + '/' +
        path.relative(config.paths.imagesPath, targetFilename)).replace(new RegExp('\\' + path.sep, 'g'), '/');
        return fullUrl;
    }).catch(function (e) {
        errors.logError(e);
        return Promise.reject(e);
    });
};

LocalFileStore.prototype.exists = function (filename) {
    return new Promise(function (resolve) {
        fs.stat(filename, function (err) {
            var exists = !err;
            resolve(exists);
        });
    });
};

// middleware for serving the files
LocalFileStore.prototype.serve = function (options) {
    var self = this;
    options = options || {};

    // CASE: serve themes
    // serveStatic can't be used to serve themes, because
    // download files depending on the route (see `send` npm module)
    if (options.isTheme) {
        return function downloadTheme(req, res, next) {
            var themeName = options.name,
                zipName = themeName + '.zip',
                zipPath = config.paths.themePath + '/' + zipName,
                stream;

            self.exists(zipPath)
                .then(function (zipExists) {
                    if (!zipExists) {
                        return execFileAsPromise('zip', ['-r', zipName, themeName], {cwd: config.paths.themePath});
                    }
                })
                .then(function () {
                    res.set({
                        'Content-disposition': 'attachment; filename={themeName}.zip'.replace('{themeName}', themeName),
                        'Content-Type': 'application/zip'
                    });

                    stream = fs.createReadStream(zipPath);
                    stream.pipe(res);
                })
                .catch(function (err) {
                    next(err);
                });
        };
    } else {
        // CASE: serve images
        // For some reason send divides the max age number by 1000
        // Fallthrough: false ensures that if an image isn't found, it automatically 404s
        return serveStatic(config.paths.imagesPath, {maxAge: utils.ONE_YEAR_MS, fallthrough: false});
    }
};

LocalFileStore.prototype.delete = function (fileName, targetDir) {
    targetDir = targetDir || this.getTargetDir(config.paths.imagesPath);

    var path = targetDir + '/' + fileName;
    return Promise.promisify(fs.remove)(path);
};

module.exports = LocalFileStore;
