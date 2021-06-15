const debug = require('@tryghost/debug')('api:v3:utils:serializers:output:invites');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                invites: models.data.map(model => model.toJSON(frame.options)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            invites: [models.toJSON(frame.options)]
        };
    }
};
