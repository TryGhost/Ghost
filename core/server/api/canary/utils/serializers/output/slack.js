const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:slack');

module.exports = {
    all(themes, apiConfig, frame) {
        debug('all');

        frame.response = themes;
    }
};
