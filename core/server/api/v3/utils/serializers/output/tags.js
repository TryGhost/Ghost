const debug = require('@tryghost/debug')('api:v3:utils:serializers:output:tags');
const mapper = require('./utils/mapper');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                tags: models.data.map(model => mapper.mapTag(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            tags: [mapper.mapTag(models, frame)]
        };
    }
};
