const {compress} = require('@tryghost/zip');
const path = require('path');
const config = require('../../../shared/config');
const fs = require('fs-extra');
const models = require('../../models');

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
    getModel() {
        return {
            ImageBackupsModel: models.ImageBackups
        };
    }
    // create backup in a new thread
    async createBackupWorker(id) {
        const self = this;
        const imagesPath = self.getDirectories().images;
        const backupsPath = self.getDirectories().backups;
        const zipPath = path.join(backupsPath, 'images.zip');
        const backupInstance = await self.getModel().ImageBackupsModel.findOne({id: id});

        fs.ensureDir(backupsPath)
            .then(async function () {
                return await compress(imagesPath, zipPath);
            }).then(async function (result) {
                if (result.size > 0){
                    if (backupInstance){
                        backupInstance.set('backup_completed', true);
                        backupInstance.save();
                        return;
                    }
                }  
            }).catch(function (err){
                //  Just destroying the db instance if an error occured, so it can be retried again. 
                //  Will find a better way to handle errors.
                backupInstance.destroy();
                throw err;
            });
    }

    startBackupProcess() {
        const self = this;
        self.getModel().ImageBackupsModel.add({created_at: new Date(), backup_completed: false}).then((entry) => {
            self.createBackupWorker(entry.attributes.id);
        });
        return {backupStarted: true};
    }
        
    serve() {
        const self = this;
        return function downloadBackup(req, res, next) {
            const backupsPath = self.getDirectories().backups;
            const zipPath = path.join(backupsPath, 'images.zip');
            let stream;
            fs.ensureDir(backupsPath)
                .then(function () {
                    res.set({
                        'Content-disposition': 'attachment; filename={backups}.zip'.replace('{backups}', 'images'),
                        'Content-Type': 'application/zip'
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

