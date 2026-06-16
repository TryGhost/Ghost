const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:plugins');

module.exports = {
    all(response, apiConfig, frame) {
        debug('all');

        if (!response) {
            return;
        }

        // For the download endpoint, pass through the raw function
        // (same pattern as themes.download)
        if (apiConfig.method === 'download') {
            frame.response = response;
            return;
        }

        // For all other endpoints, wrap in { plugins: [...] }
        frame.response = {};

        frame.response.plugins = Array.isArray(response) ? response : [response];

        if (response.meta) {
            frame.response.meta = response.meta;
        }
    }
};
