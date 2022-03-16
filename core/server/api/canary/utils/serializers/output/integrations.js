const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:integrations');
const mappers = require('./mappers');

module.exports = {
    browse({data, meta}, apiConfig, frame) {
        debug('browse');

        frame.response = {
            integrations: data.map(model => mappers.integrations(model, frame)),
            meta
        };
    },
    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            integrations: [mappers.integrations(model, frame)]
        };
    },
    add(model, apiConfig, frame) {
        debug('add');

        frame.response = {
            integrations: [mappers.integrations(model, frame)]
        };
    },
    edit(model, apiConfig, frame) {
        debug('edit');

        frame.response = {
            integrations: [mappers.integrations(model, frame)]
        };
    }
};
