const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:db');
const optionsUtil = require('../../../../shared/utils/options');

const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

module.exports = {
    all(apiConfig, frame) {
        debug('serialize all');

        if (frame.options.include) {
            frame.options.include = optionsUtil.trimAndLowerCase(frame.options.include);
        }

        if (!frame.options.context.internal) {
            debug('omit internal options');
            frame.options = _.omit(frame.options, INTERNAL_OPTIONS);
        }

        debug(frame.options);
    }
};
