const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:all');

// Strips the legacy `published_by` field (a posts/pages column) from API
// responses. This runs after every endpoint, so the walk avoids per-key tuple
// allocations, array literals, and lodash calls in the hot path.
const removeXBY = (object) => {
    for (const key of Object.keys(object)) {
        // CASE: go deeper
        const value = object[key];
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
            removeXBY(value);
        } else if (key === 'published_by') {
            delete object[key];
        }
    }

    return object;
};

module.exports = {
    after(apiConfig, frame) {
        debug('all after');

        if (frame.response) {
            frame.response = removeXBY(frame.response);
        }
    }
};
