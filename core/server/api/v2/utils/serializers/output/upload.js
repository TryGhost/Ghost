const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:upload');

module.exports = {
    image(models, apiConfig, frame) {
        debug('image');

        return frame.response = models;
    }
};
