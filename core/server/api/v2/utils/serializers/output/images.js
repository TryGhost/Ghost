const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:images');
const mapper = require('./utils/mapper');

module.exports = {
    upload(path, apiConfig, frame) {
        debug('upload');

        return frame.response = {
            url: mapper.mapImage(path)
        };
    }
};
