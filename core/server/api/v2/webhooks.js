const models = require('../../models');
const common = require('../../lib/common');

module.exports = {
    docName: 'webhooks',
    add: {
        statusCode: 201,
        headers: {},
        options: [],
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
