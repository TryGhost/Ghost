const debug = require('ghost-ignition').debug('api:canary:utils:serializers:input:authors');
const slugFilterOrder = require('./utils/slug-filter-order');
const utils = require('../../index');

function setDefaultOrder(frame) {
    if (!frame.options.order && frame.options.filter) {
        frame.options.autoOrder = slugFilterOrder('users', frame.options.filter);
    }

    if (!frame.options.order && !frame.options.autoOrder) {
        frame.options.order = 'name asc';
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        if (utils.isContentAPI(frame)) {
            setDefaultOrder(frame);
        }
    },

    read(apiConfig, frame) {
        debug('read');

        if (utils.isContentAPI(frame)) {
            setDefaultOrder(frame);
        }
    }
};
