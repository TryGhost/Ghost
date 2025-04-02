const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:all');
const _ = require('lodash');

const removeXBY = (object) => {
    for (const [key, value] of Object.entries(object)) {
        // CASE: go deeper
        if (_.isObject(value) || _.isArray(value)) {
            removeXBY(value);
        } else if (['updated_by', 'created_by', 'published_by'].includes(key)) {
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
