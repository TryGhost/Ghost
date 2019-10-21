const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:config');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');
        frame.response = {
            config: data
        };
    }
};
