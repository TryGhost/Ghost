const models = require('../../models');
const common = require('../../lib/common');
const megaService = require('../../services/mega');

module.exports = {
    docName: 'emails',

    read: {
        options: [
            'fields'
        ],
        validation: {
            options: {
                fields: ['html', 'plaintext', 'subject']
            }
        },
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            return models.Email.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.models.email.emailNotFound')
                        });
                    }

                    return model;
                });
        }
    },

    retry: {
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            return models.Email.findOne(frame.data, frame.options)
                .then(async (model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.models.email.emailNotFound')
                        });
                    }

                    if (model.get('status') !== 'failed') {
                        throw new common.errors.IncorrectUsageError({
                            message: common.i18n.t('errors.models.email.retryNotAllowed')
                        });
                    }

                    return await megaService.mega.retryFailedEmail(model);
                });
        }
    }
};
