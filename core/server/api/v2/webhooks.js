const models = require('../../models');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');

module.exports = {
    docName: 'webhooks',

    add: {
        statusCode: 201,
        headers: {},
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
                        new errors.ValidationError({message: i18n.t('errors.api.webhooks.webhookAlreadyExists')})
                    );
                }

                return models.Webhook.add(frame.data.webhooks[0], frame.options);
            });
        }
    },

    edit: {
        permissions: true,
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
                        message: i18n.t('errors.api.resource.resourceNotFound', {
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
        permissions: true,
        query(frame) {
            frame.options.require = true;
            return models.Webhook.destroy(frame.options)
                .then(() => null)
                .catch(models.Webhook.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.resource.resourceNotFound', {
                            resource: 'Webhook'
                        })
                    }));
                });
        }
    }
};
