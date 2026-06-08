const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:featurebase');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = {
            featurebase: data
        };
    }
};
