const _ = require('lodash');
const debug = require('@tryghost/debug')('api:v2:utils:serializers:output:site');

module.exports = {
    read(data, apiConfig, frame) {
        debug('read');

        frame.response = {
            site: _.pick(data, [
                'title',
                'url',
                'version'
            ])
        };
    }
};
