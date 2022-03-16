const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:authors');
const mappers = require('./mappers');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            authors: models.data.map(model => mappers.users(model, frame)),
            meta: models.meta
        };
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            authors: [mappers.users(model, frame)]
        };
    }
};
