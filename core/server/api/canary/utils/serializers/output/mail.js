const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:mail');

module.exports = {
    all(response, apiConfig, frame) {
        debug('all');
        const toReturn = _.cloneDeep(frame.data);

        delete toReturn.mail[0].options;
        // Sendmail returns extra details we don't need and that don't convert to JSON
        delete toReturn.mail[0].message.transport;

        toReturn.mail[0].status = {
            message: response.message
        };

        frame.response = toReturn;
    }
};
