const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:authors');
const mapper = require('./utils/mapper');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            authors: models.data.map(model => mapper.mapUser(model, frame)),
            meta: models.meta
        };
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            authors: [mapper.mapUser(model, frame)]
        };
    }
};
