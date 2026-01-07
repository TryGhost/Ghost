const jsonSchema = require('../utils/json-schema');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    invalidExpiresAt: 'expires_at must be a valid ISO 8601 date string'
};

module.exports = {
    async disable(apiConfig, frame) {
        await jsonSchema.validate(apiConfig, frame);

        // Parse and validate expires_at if provided
        if (frame.data.expires_at) {
            const parsed = new Date(frame.data.expires_at);
            if (isNaN(parsed.getTime())) {
                throw new errors.ValidationError({
                    message: tpl(messages.invalidExpiresAt)
                });
            }
            // Replace string with parsed Date for downstream consumers
            frame.data.expires_at = parsed;
        }
    }
};
