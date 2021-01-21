const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:webhooks');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');
        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        frame.response = {
            webhooks: [models.toJSON(frame.options)]
        };
    }
};
