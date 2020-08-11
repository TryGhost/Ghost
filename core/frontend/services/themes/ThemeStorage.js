const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const config = require('../../../shared/config');
const security = require('@tryghost/security');
const {compress} = require('@tryghost/zip');
const LocalFileStorage = require('../../../server/adapters/storage/LocalFileStorage');

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
        const self = this;

        return function downloadTheme(req, res, next) {
            const themeName = options.name;
            const themePath = path.join(self.storagePath, themeName);
            const zipName = themeName + '.zip';

            // store this in a unique temporary folder
            const zipBasePath = path.join(os.tmpdir(), security.identifier.uid(10));

            const zipPath = path.join(zipBasePath, zipName);
            let stream;

            fs.ensureDir(zipBasePath)
                .then(function () {
                    return compress(themePath, zipPath);
                })
                .then(function (result) {
                    res.set({
                        'Content-disposition': 'attachment; filename={themeName}.zip'.replace('{themeName}', themeName),
                        'Content-Type': 'application/zip',
                        'Content-Length': result.size
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

    /**
     * Rename a file / folder
     *
     *
     * @param String fileName
     */
    rename(srcName, destName) {
        let src = path.join(this.getTargetDir(), srcName);
        let dest = path.join(this.getTargetDir(), destName);

        return fs.move(src, dest);
    }

    /**
     * Rename a file / folder
     *
     * @param String backupName
     */
    delete(fileName) {
        return fs.remove(path.join(this.getTargetDir(), fileName));
    }
}

module.exports = ThemeStorage;
