const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:tags');
const url = require('./utils/url');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                tags: models.data.map(model => url.forTag(model.id, model.toJSON(frame.options), frame.options)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            tags: [url.forTag(models.id, models.toJSON(frame.options), frame.options)]
        };

        debug(frame.response);
    }
};
