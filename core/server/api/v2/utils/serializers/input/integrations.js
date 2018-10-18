const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:integrations');

module.exports = {
    add(apiConfig, frame) {
        debug('add');

        frame.data = _.pick(frame.data.integrations[0], apiConfig.data);
    },
    edit(apiConfig, frame) {
        debug('edit');

        frame.data = _.pick(frame.data.integrations[0], apiConfig.data);
    }
};
