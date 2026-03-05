const defaultSerializer = require('./default');

module.exports = {
    all(response, apiConfig, frame) {
        // browseActivity returns a custom shape {activity, meta} — pass it through as-is
        if (apiConfig.method === 'browseActivity') {
            frame.response = response;
            return;
        }

        // All other methods use the default serializer
        defaultSerializer.all(response, apiConfig, frame);
    }
};
