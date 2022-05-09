const backupsServices = require('../../services/backups');
const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    backupsNotFound: 'No Backups Found',
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
            console.log('status')
            return models.ImageBackups.query((model)=> {
                console.log(model);
                if (!model) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.emailNotFound)
                    });
                }

                return model;

            // return backupsServices.api.getZippingStatus();
        });
    }
}
};
