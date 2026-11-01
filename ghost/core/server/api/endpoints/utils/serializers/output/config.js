const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:config');

module.exports = {
  all(data, apiConfig, frame) {
    debug('all');

    const keys = [
      'version',
      'capabilities',
      'environment',
      'database',
      'mail',
      'useGravatar',
      'labs',
      'clientExtensions',
      'enableDeveloperExperiments',
      'stripeDirect',
      'mailgunIsConfigured',
      'emailAnalytics',
      'hostSettings',
      'klipy',
      'pintura',
      'signupForm',
      'stats',
      'security',
      'exploreTestimonialsUrl',
      'featurebase',
      'docsbot',
    ];

    frame.response = {
      config: _.pick(data, keys),
    };
  },
};
