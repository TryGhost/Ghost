const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:input:webhooks');

module.exports = {
    add(apiConfig, frame) {
        debug('add');

        if (_.get(frame, 'options.context.api_key.id')) {
            frame.data.webhooks[0].integration_id = frame.options.context.api_key.id;
        }
    }
};
