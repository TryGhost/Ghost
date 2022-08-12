const debug = require('@tryghost/debug')('api:utils:serializers:output:slack');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = data;
    }
};
