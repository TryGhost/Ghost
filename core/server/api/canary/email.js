const models = require('../../models');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
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
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.models.email.emailNotFound')
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
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.models.email.emailNotFound')
                        });
                    }

                    if (model.get('status') !== 'failed') {
                        throw new errors.IncorrectUsageError({
                            message: i18n.t('errors.models.email.retryNotAllowed')
                        });
                    }

                    return await megaService.mega.retryFailedEmail(model);
                });
        }
    }
};
