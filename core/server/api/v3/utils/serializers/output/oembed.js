const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:oembed');

module.exports = {
    all(res, apiConfig, frame) {
        debug('all');
        frame.response = res;
    }
};
