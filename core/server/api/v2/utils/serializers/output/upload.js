const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:upload');
const mapper = require('./utils/mapper');

module.exports = {
    image(models, apiConfig, frame) {
        debug('image');

        return frame.response = mapper.mapImage(models);
    }
};
