const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const megaService = require('../../services/mega');
const emailService = require('../../services/email-service');
const labs = require('../../../shared/labs');

const messages = {
    emailNotFound: 'Email not found.',
    retryNotAllowed: 'Only failed emails can be retried'
};

const allowedBatchIncludes = ['count.recipients'];
const allowedFailureIncludes = ['member', 'email_recipient'];

module.exports = {
    docName: 'emails',

    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'page'
        ],
        permissions: true,
        async query(frame) {
            return await models.Email.findPage(frame.options);
        }
    },

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
        // (complexity removed with new labs flag)
        // eslint-disable-next-line ghost/ghost-custom/max-api-complexity
        async query(frame) {
            if (labs.isSet('emailStability')) {
                return await emailService.controller.retryFailedEmail(frame);
            }

            const model = await models.Email.findOne(frame.data, frame.options);
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
        }
    },

    browseBatches: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'page',
            'include'
        ],
        data: [
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedBatchIncludes
                }
            }
        },
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            const filter = `email_id:'${frame.data.id}'` + (frame.options.filter ? `+(${frame.options.filter})` : '');
            return await models.EmailBatch.findPage({...frame.options, filter});
        }
    },

    browseFailures: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'page',
            'include'
        ],
        data: [
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedFailureIncludes
                }
            }
        },
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            const filter = `email_id:'${frame.data.id}'` + (frame.options.filter ? `+(${frame.options.filter})` : '');
            return await models.EmailRecipientFailure.findPage({...frame.options, filter});
        }
    }
};
