const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:posts');
const url = require('./utils/url');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                posts: models.data.map(model => url.forPost(model.id, model.toJSON(frame.options), frame.options)),
                meta: models.meta
            };

            debug(frame.response);
            return;
        }

        frame.response = {
            posts: [url.forPost(models.id, models.toJSON(frame.options), frame.options)]
        };

        debug(frame.response);
    }
};
