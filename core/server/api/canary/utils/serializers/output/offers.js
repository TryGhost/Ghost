const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:offers');
const utils = require('../../index');

module.exports = {
    all(_models, _apiConfig, frame) {
        debug('all');
        // Offers has frame.response already set

        // Cleanup response for content API
        // TODO: remove and set explicit allowlist when moved to mapper
        if (utils.isContentAPI(frame) && frame.response?.offers?.[0]) {
            delete frame.response.offers[0].redemption_count;
            delete frame.response.offers[0].code;
        }
    }
};
