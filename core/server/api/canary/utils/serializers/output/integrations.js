const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:integrations');
const mappers = require('./mappers');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                integrations: models.data.map(model => mappers.integrations(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            integrations: [mappers.integrations(models, frame)]
        };
    }
};
