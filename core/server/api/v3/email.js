const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const megaService = require('../../services/mega');

const messages = {
    emailNotFound: 'Email not found.'
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
                            message: tpl(messages.emailNotFound)
                        });
                    }

                    return await megaService.mega.retryFailedEmail(model);
                });
        }
    }
};
