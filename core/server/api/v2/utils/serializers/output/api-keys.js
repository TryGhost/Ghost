const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:pages');

module.exports = {
    add(model, apiConfig, frame) {
        debug('add');
        frame.response = {
            api_keys: [model.toJSON(frame.options)]
        };
        debug(frame.response);
    }
};
