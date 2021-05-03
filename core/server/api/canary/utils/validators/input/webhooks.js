const _ = require('lodash');
const errors = require('@tryghost/errors');
const i18n = require('../../../../../../shared/i18n');
const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        if (!_.get(frame, 'options.context.integration.id') && !_.get(frame.data, 'webhooks[0].integration_id')) {
            return Promise.reject(new errors.ValidationError({
                message: i18n.t('notices.data.validation.index.schemaValidationFailed', {
                    key: 'integration_id'
                }),
                context: i18n.t('errors.api.webhooks.noIntegrationIdProvided.context'),
                property: 'integration_id'
            }));
        }

        return jsonSchema.validate(apiConfig, frame);
    },

    edit: jsonSchema.validate
};
