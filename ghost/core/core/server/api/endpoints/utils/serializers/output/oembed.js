const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:oembed');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');
        frame.response = data;
    }
};
