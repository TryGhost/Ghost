const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:posts');
const mapper = require('./utils/mapper');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                posts: models.data.map(model => mapper.mapPost(model, frame)),
                meta: models.meta
            };

            debug(frame.response);
            return;
        }

        frame.response = {
            posts: [mapper.mapPost(models, frame)]
        };

        debug(frame.response);
    }
};
