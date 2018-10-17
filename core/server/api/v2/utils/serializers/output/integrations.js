const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:integrations');

module.exports = {
    add(model, apiConfig, frame) {
        debug('add');

        frame.response = {
            integrations: [model.toJSON()]
        };
    }
};

