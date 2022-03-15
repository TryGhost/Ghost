const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:actions');
const mappers = require('./mappers');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            actions: models.data.map(model => mappers.actions(model, frame)),
            meta: models.meta
        };
    }
};
