const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:mail');

module.exports = {
  send(response, apiConfig, frame) {
    debug('send');
    const toReturn = _.cloneDeep(frame.data);

    if (toReturn && toReturn.mail && toReturn.mail[0]) {
      delete toReturn.mail[0].options;
      // Sendmail returns extra details we don't need and that don't convert to JSON
      delete toReturn.mail[0].message.transport;

      toReturn.mail[0].status = {
        message: response ? response.message : undefined,
      };

      frame.response = toReturn;
    } else {
      frame.response = response;
    }
  },

  sendTestEmail(response, apiConfig, frame) {
    debug('sendTestEmail');
    frame.response = response;
  },

  all(response, apiConfig, frame) {
    if (frame.data && frame.data.mail && frame.data.mail[0]) {
      return this.send(response, apiConfig, frame);
    }
    frame.response = response;
  },
};
