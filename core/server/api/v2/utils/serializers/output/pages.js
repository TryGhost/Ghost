const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:pages');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (models.meta) {
            frame.response = {
                pages: models.data.map(model => model.toJSON(frame.options)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            pages: [models.toJSON(frame.options)]
        };

        debug(frame.response);
    }
};
