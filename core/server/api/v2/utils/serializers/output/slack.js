const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:slack');

module.exports = {
    all(slug, apiConfig, frame) {
        debug('all');

        frame.response = {};

        debug(frame.response);
    }
};
