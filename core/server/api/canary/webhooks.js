const models = require('../../models');
const common = require('../../lib/common');

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
                        new common.errors.ValidationError({message: common.i18n.t('errors.api.webhooks.webhookAlreadyExists')})
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
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.resource.resourceNotFound', {
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
            return models.Webhook.destroy(frame.options).return(null);
        }
    }
};
