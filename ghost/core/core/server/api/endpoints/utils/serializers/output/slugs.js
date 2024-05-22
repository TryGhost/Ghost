const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:slugs');

module.exports = {
    all(slug, apiConfig, frame) {
        debug('all');

        frame.response = {
            slugs: [{slug}]
        };
    }
};
