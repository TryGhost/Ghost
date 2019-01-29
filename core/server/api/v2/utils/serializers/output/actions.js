const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:actions');
const mapper = require('./utils/mapper');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            actions: models.data.map(model => mapper.mapAction(model, frame)),
            meta: models.meta
        };

        debug(frame.response);
    }
};
