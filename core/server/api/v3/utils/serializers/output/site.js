const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:site');

module.exports = {
    read(data, apiConfig, frame) {
        debug('read');

        frame.response = {
            site: _.pick(data, [
                'title',
                'description',
                'logo',
                'accent_color',
                'url',
                'version'
            ])
        };
    }
};
