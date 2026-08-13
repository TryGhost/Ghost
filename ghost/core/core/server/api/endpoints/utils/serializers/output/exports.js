const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:exports');

module.exports = {
    // The query returns a stream-response handler; pass it through untouched so
    // the http layer hands the express response to it (same as themes)
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = data;
    }
};
