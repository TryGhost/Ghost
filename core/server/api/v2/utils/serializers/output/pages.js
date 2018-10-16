const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:pages');
const url = require('./utils/url');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (models.meta) {
            frame.response = {
                pages: models.data.map(model => url.forPost(model.id, model.toJSON(frame.options), frame.options)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            pages: [url.forPost(models.id, models.toJSON(frame.options), frame.options)]
        };

        debug(frame.response);
    }
};
