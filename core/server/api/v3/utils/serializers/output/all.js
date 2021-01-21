const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:all');
const _ = require('lodash');

const removeXBY = (object) => {
    _.each(object, (value, key) => {
        // CASE: go deeper
        if (_.isObject(value) || _.isArray(value)) {
            removeXBY(value);
        } else if (['updated_by', 'created_by', 'published_by'].includes(key)) {
            delete object[key];
        }
    });

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
