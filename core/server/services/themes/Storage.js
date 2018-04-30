var fs = require('fs-extra'),
    os = require('os'),
    path = require('path'),
    Promise = require('bluebird'),
    config = require('../../config'),
    security = require('../../lib/security'),
    fsLib = require('../../lib/fs'),
    LocalFileStorage = require('../../adapters/storage/LocalFileStorage');

/**
 * @TODO: combine with loader.js?
 */
class ThemeStorage extends LocalFileStorage {
    constructor() {
        super();

        this.storagePath = config.getContentPath('themes');
    }

    getTargetDir() {
        return this.storagePath;
    }

    serve(options) {
        var self = this;

        return function downloadTheme(req, res, next) {
            var themeName = options.name,
                themePath = path.join(self.storagePath, themeName),
                zipName = themeName + '.zip',
                // store this in a unique temporary folder
                zipBasePath = path.join(os.tmpdir(), security.identifier.uid(10)),
                zipPath = path.join(zipBasePath, zipName),
                stream;

            fs.ensureDir(zipBasePath)
                .then(function () {
                    return Promise.promisify(fsLib.zipFolder)(themePath, zipPath);
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
                    return fs.remove(zipBasePath);
                });
        };
    }

    delete(fileName) {
        return fs.remove(path.join(this.storagePath, fileName));
    }
}

module.exports = ThemeStorage;
