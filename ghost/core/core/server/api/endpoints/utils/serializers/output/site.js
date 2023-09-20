const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:site');

module.exports = {
    read(data, apiConfig, frame) {
        debug('read');

        frame.response = {
            site: _.pick(data, [
                'title',
                'description',
                'logo',
                'icon',
                'cover_image',
                'accent_color',
                'locale',
                'url',
                'version',
                'allow_external_signup',
                'sentry_dsn',
                'sentry_env'
            ])
        };
    }
};
