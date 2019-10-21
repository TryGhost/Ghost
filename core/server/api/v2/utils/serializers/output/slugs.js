const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:slugs');

module.exports = {
    all(slug, apiConfig, frame) {
        debug('all');

        frame.response = {
            slugs: [{slug}]
        };
    }
};
