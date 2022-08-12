const debug = require('@tryghost/debug')('api:utils:serializers:output:explore');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = {
            explore: data
        };
    }
};
