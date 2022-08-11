const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:integrations');

function setDefaultFilter(frame) {
    if (frame.options.filter) {
        frame.options.filter = `(${frame.options.filter})+type:[custom,builtin,core]`;
    } else {
        frame.options.filter = 'type:[custom,builtin,core]';
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        setDefaultFilter(frame);
    },
    read(apiConfig, frame) {
        debug('read');

        setDefaultFilter(frame);
    },
    add(apiConfig, frame) {
        debug('add');

        frame.data = _.pick(frame.data.integrations[0], apiConfig.data);
    },
    edit(apiConfig, frame) {
        debug('edit');

        frame.data = _.pick(frame.data.integrations[0], apiConfig.data);
    }
};
