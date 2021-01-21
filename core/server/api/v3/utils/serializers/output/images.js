const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:images');
const mapper = require('./utils/mapper');

module.exports = {
    upload(path, apiConfig, frame) {
        debug('upload');

        return frame.response = {
            images: [{
                url: mapper.mapImage(path),
                ref: frame.data.ref || null
            }]
        };
    }
};
