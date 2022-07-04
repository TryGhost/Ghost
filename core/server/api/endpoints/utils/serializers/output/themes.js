const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:themes');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = data;
    }
};
