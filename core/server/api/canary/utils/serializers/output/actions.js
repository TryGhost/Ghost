const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:actions');
const mapper = require('./utils/mapper');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            actions: models.data.map(model => mapper.mapAction(model, frame)),
            meta: models.meta
        };
    }
};
