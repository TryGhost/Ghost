const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:mail');

module.exports = {
    all(configuration, apiConfig, frame) {
        frame.response = {
            configuration: configuration ? [configuration] : []
        };

        debug(frame.response);
    }
};
