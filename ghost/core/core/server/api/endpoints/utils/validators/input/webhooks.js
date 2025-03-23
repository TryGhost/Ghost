const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const jsonSchema = require('../utils/json-schema');

const messages = {
    schemaValidationFailed: 'Validation failed for \'{key}\'.',
    noIntegrationIdProvidedContext: 'You may only create webhooks with \'integration_id\' when using session authentication.'
};

module.exports = {
    add(apiConfig, frame) {
        if (!_.get(frame, 'options.context.integration.id') && !_.get(frame.data, 'webhooks[0].integration_id')) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.schemaValidationFailed, {
                    key: 'integration_id'
                }),
                context: tpl(messages.noIntegrationIdProvidedContext),
                property: 'integration_id'
            }));
        }

        return jsonSchema.validate(apiConfig, frame);
    },

    edit: jsonSchema.validate
};
