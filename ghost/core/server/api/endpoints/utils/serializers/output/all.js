const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:all');

const { removeXBY } = require('./utils/remove-x-by');

module.exports = {
  after(apiConfig, frame) {
    debug('all after');

    if (frame.response) {
      frame.response = removeXBY(frame.response);
    }
  },
};
