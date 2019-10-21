const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:slugs');

module.exports = {
    all(slug, apiConfig, frame) {
        debug('all');

        frame.response = {
            slugs: [{slug}]
        };
    }
};
