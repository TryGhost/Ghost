const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:backups');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        frame.response = data;
    }
};
