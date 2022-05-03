const {compress} = require('@tryghost/zip');
const path = require('path');
const config = require('../../../shared/config');
const fs = require('fs-extra');

/**
 * Prototype for exporting images in bulk
 */

class BackupsExporter {


    getDirectories() {
        return {
            images: config.getContentPath('images'),
            backups: config.getContentPath('backups')
        };
    }

    /**
     * 
     * @TODO: Perhaps let it multithread to avoid http timeouts and memory issues on big requests?
     * Maybe add cases later for other types for backups?
     */

    serve() {
        const self = this;
        return function downloadBackup(req, res, next) {
            console.log('running dlbk')
            const backupsPath = self.getDirectories().backups;
            const imagesPath = self.getDirectories().images;
            const zipPath = path.join(backupsPath, 'images.zip');
            let stream;
            fs.ensureDir(backupsPath)
                .then(async function () {
                    return await compress(imagesPath, zipPath);
                })
                .then(function (result) {
                    res.set({
                        'Content-disposition': 'attachment; filename={backups}.zip'.replace('{backups}', 'images'),
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
                    return;
                });
        };
    }
}

module.exports = BackupsExporter;

