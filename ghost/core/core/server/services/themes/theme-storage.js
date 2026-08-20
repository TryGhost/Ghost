const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const config = require('../../../shared/config');
const security = require('@tryghost/security');
const {compress} = require('@tryghost/zip');
const LocalStorageBase = require('../../adapters/storage/LocalStorageBase').default;

/**
 * @TODO: combine with loader.js?
 */
class ThemeStorage extends LocalStorageBase {
    constructor() {
        super({
            storagePath: config.getContentPath('themes')
        });
    }

    getTargetDir() {
        return this.storagePath;
    }

    /**
     * The single place a theme is turned into a zip — shared by the theme
     * download endpoint and the site export.
     *
     * @param {string} themeName
     * @param {string} zipPath - full path the zip is written to
     * @returns {Promise<{path: string, size: number}>}
     */
    zipToFile(themeName, zipPath) {
        return compress(path.join(this.storagePath, themeName), zipPath);
    }

    serve(options) {
        const self = this;

        return function downloadTheme(req, res, next) {
            const themeName = options.name;
            const zipName = themeName + '.zip';

            // store this in a unique temporary folder
            const zipBasePath = path.join(os.tmpdir(), security.identifier.uid(10));

            const zipPath = path.join(zipBasePath, zipName);
            let stream;

            fs.ensureDir(zipBasePath)
                .then(function () {
                    return self.zipToFile(themeName, zipPath);
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
     * @param {string} srcName
     * @param {string} destName
     */
    rename(srcName, destName) {
        let src = path.join(this.getTargetDir(), srcName);
        let dest = path.join(this.getTargetDir(), destName);

        return fs.move(src, dest);
    }

    /**
     * Remove a file / folder
     *
     * @param {string} fileName
     * @returns {Promise<void>}
     */
    delete(fileName) {
        return fs.remove(path.join(this.getTargetDir(), fileName));
    }
}

module.exports = ThemeStorage;
