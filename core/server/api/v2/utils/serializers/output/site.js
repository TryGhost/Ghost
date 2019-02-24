const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:site');

module.exports = {
    read(data, apiConfig, frame) {
        debug('read');

        frame.response = {
            site: data
        };
    }
};
