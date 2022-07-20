const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const getWebhooksServiceInstance = require('../../services/webhooks/webhooks-service');

const messages = {
    resourceNotFound: '{resource} not found.',
    noPermissionToEdit: {
        message: 'You do not have permission to {method} this webhook.',
        context: 'You may only {method} webhooks that belong to the authenticated integration. Check the supplied Admin API Key.'
    }
};

const webhooksService = getWebhooksServiceInstance({
    WebhookModel: models.Webhook
});

module.exports = {
    docName: 'webhooks',

    add: {
        statusCode: 201,
        headers: {
            // NOTE: remove if there is ever a 'read' method
            location: false
        },
        options: [],
        data: [],
        permissions: true,
        async query(frame) {
            return await webhooksService.add(frame.data, frame.options);
        }
    },

    edit: {
        permissions: {
            before: (frame) => {
                if (frame.options.context && frame.options.context.integration && frame.options.context.integration.id) {
                    return models.Webhook.findOne({id: frame.options.id})
                        .then((webhook) => {
                            if (!webhook) {
                                throw new errors.NotFoundError({
                                    message: tpl(messages.resourceNotFound, {
                                        resource: 'Webhook'
                                    })
                                });
                            }

                            if (webhook.get('integration_id') !== frame.options.context.integration.id) {
                                throw new errors.NoPermissionError({
                                    message: tpl(messages.noPermissionToEdit.message, {
                                        method: 'edit'
                                    }),
                                    context: tpl(messages.noPermissionToEdit.context, {
                                        method: 'edit'
                                    })
                                });
                            }
                        });
                }
            }
        },
        data: [
            'name',
            'event',
            'target_url',
            'secret',
            'api_version'
        ],
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        query({data, options}) {
            return models.Webhook.edit(data.webhooks[0], Object.assign(options, {require: true}))
                .catch(models.Webhook.NotFoundError, () => {
                    throw new errors.NotFoundError({
                        message: tpl(messages.resourceNotFound, {
                            resource: 'Webhook'
                        })
                    });
                });
        }
    },

    destroy: {
        statusCode: 204,
        headers: {},
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            before: (frame) => {
                if (frame.options.context && frame.options.context.integration && frame.options.context.integration.id) {
                    return models.Webhook.findOne({id: frame.options.id})
                        .then((webhook) => {
                            if (!webhook) {
                                throw new errors.NotFoundError({
                                    message: tpl(messages.resourceNotFound, {
                                        resource: 'Webhook'
                                    })
                                });
                            }

                            if (webhook.get('integration_id') !== frame.options.context.integration.id) {
                                throw new errors.NoPermissionError({
                                    message: tpl(messages.noPermissionToEdit.message, {
                                        method: 'destroy'
                                    }),
                                    context: tpl(messages.noPermissionToEdit.context, {
                                        method: 'destroy'
                                    })
                                });
                            }
                        });
                }
            }
        },
        query(frame) {
            frame.options.require = true;

            return models.Webhook.destroy(frame.options)
                .then(() => null)
                .catch(models.Webhook.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.resourceNotFound, {
                            resource: 'Webhook'
                        })
                    }));
                });
        }
    }
};
