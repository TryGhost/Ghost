const models = require('../../models');
const errors = require('@tryghost/errors');
const megaService = require('../../services/mega');
const tpl = require('@tryghost/tpl');

const messages = {
    emailNotFound: 'Email not found.',
    retryNotAllowed: 'Only failed emails can be retried'
};

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
                            message: tpl(messages.emailNotFound)
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
                            message: tpl(messages.emailNotFound)
                        });
                    }

                    if (model.get('status') !== 'failed') {
                        throw new errors.IncorrectUsageError({
                            message: tpl(messages.retryNotAllowed)
                        });
                    }

                    return await megaService.mega.retryFailedEmail(model);
                });
        }
    }
};
