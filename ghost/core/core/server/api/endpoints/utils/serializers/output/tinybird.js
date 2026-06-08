const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:tinybird');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = {
            tinybird: data
        };
    }
};