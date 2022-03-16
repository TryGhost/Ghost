const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:tags');
const mappers = require('./mappers');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                tags: models.data.map(model => mappers.tags(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            tags: [mappers.tags(models, frame)]
        };
    }
};
