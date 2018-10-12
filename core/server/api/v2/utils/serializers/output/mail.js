const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:mail');

module.exports = {
    all(response, apiConfig, frame) {
        const toReturn = _.cloneDeep(frame.data);

        delete toReturn.mail[0].options;
        // Sendmail returns extra details we don't need and that don't convert to JSON
        delete toReturn.mail[0].message.transport;

        toReturn.mail[0].status = {
            message: response.message
        };

        frame.response = toReturn;

        debug(frame.response);
    }
};
