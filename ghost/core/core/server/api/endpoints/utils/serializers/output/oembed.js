const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:oembed');
const mappers = require('./mappers');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');
        if (data?.metadata?.thumbnail) {
            data.metadata.thumbnail = mappers.oembed(data.metadata.thumbnail);
        }
        if (data?.metadata?.icon) {
            data.metadata.icon = mappers.oembed(data.metadata.icon);
        }
        frame.response = data;
    }
};
