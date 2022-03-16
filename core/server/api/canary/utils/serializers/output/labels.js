const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:labels');
const mappers = require('./mappers');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                labels: models.data.map(model => mappers.labels(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            labels: [mappers.labels(models, frame)]
        };
    }
};
