const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:pages');
const mapper = require('./utils/mapper');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (models.meta) {
            frame.response = {
                pages: models.data.map(model => mapper.mapPage(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            pages: [mapper.mapPage(models, frame)]
        };

        debug(frame.response);
    }
};
