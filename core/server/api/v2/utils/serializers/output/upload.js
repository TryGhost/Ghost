const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:upload');
const mapper = require('./utils/mapper');

module.exports = {
    image(path, apiConfig, frame) {
        debug('image');

        return frame.response = {
            url: mapper.mapImage(path)
        };
    }
};
