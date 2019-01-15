const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:authors');
const utils = require('../../index');

function setDefaultOrder(frame) {
    if (!frame.options.order) {
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
