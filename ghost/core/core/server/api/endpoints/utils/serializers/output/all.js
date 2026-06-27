const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:all');

// Strips the legacy `published_by` field (a posts/pages column) from anywhere in
// the response. This runs after every endpoint, so the walk stays allocation-free
// in the hot path: a direct key comparison and a typeof check, no per-key array
// literal or lodash calls.
const removeXBY = (object) => {
    for (const key of Object.keys(object)) {
        if (key === 'published_by') {
            delete object[key];
            continue;
        }

        // CASE: go deeper
        const value = object[key];
        if (value !== null && typeof value === 'object') {
            removeXBY(value);
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
