const backupsServices = require('../../services/backups');
const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    backupsNotFound: 'No Backups Found'
};

module.exports = {
    docName: 'backups',
    downloadBackup: {
        permissions: false,
        query() {
            return backupsServices.api.exporter();
        }
    },
    initialize: {
        permissions: false,
        query() {
            return backupsServices.api.initializeImageZipping();
        }
    },
    zippingStatus: {
        permissions: false,
        async query() {
            const backupInstance = await models.ImageBackups.forge().orderBy('created_at', 'DESC').fetch();
            if (!backupInstance) {
                throw new errors.NotFoundError({
                    message: tpl(messages.backupsNotFound)
                });
            }
            return backupInstance;
        }
    }
};
