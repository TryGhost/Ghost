const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:ai');

module.exports = {
    generateImageAltText(response, apiConfig, frame) {
        debug('generateImageAltText');

        frame.response = response;
    }
};
