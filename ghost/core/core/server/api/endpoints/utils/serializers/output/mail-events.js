const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:mail-events');

module.exports = {
    add(response, apiConfig, frame) {
        debug('add');

        frame.response = {};
    }
};
