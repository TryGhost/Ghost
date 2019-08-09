const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:config');

module.exports = {
    all(data, apiConfig, frame) {
        frame.response = {
            config: data
        };

        debug(frame.response);
    }
};
