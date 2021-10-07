const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    resourceNotFound: '{resource} not found.',
    noPermissionToEdit: {
        message: 'You do not have permission to {method} this webhook.',
        context: 'You may only {method} webhooks that belong to the authenticated integration. Check the supplied Admin API Key.'
    },
    webhookAlreadyExists: 'Target URL has already been used for this event.'
};

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
        validation: {
            data: {
                event: {
                    required: true
                },
                target_url: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Webhook.getByEventAndTarget(
                frame.data.webhooks[0].event,
                frame.data.webhooks[0].target_url,
                frame.options
            ).then((webhook) => {
                if (webhook) {
                    return Promise.reject(
                        new errors.ValidationError({message: tpl(messages.webhookAlreadyExists)})
                    );
                }

                return models.Webhook.add(frame.data.webhooks[0], frame.options);
            });
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
