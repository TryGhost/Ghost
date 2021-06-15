const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:webhooks');

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
