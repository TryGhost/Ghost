const _ = require('lodash');
const labs = require('../../../../../../shared/labs');
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:config');

module.exports = {
    all(data, apiConfig, frame) {
        debug('all');

        const keys = [
            'version',
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
            'hostSettings'
        ];

        if (labs.isSet('gifsCard')) {
            keys.push('tenor');
        }

        frame.response = {
            config: _.pick(data, keys)
        };
    }
};
