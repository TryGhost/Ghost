const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:oembed');

module.exports = {
    all(res, apiConfig, frame) {
        debug('all');
        frame.response = res;
    }
};
