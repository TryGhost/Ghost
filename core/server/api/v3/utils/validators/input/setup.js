const debug = require('ghost-ignition').debug('api:v3:utils:validators:input:updateSetup');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');

module.exports = {
    updateSetup(apiConfig, frame) {
        debug('resetPassword');

        if (!frame.options.context || !frame.options.context.user) {
            throw new errors.NoPermissionError({message: i18n.t('errors.api.authentication.notTheBlogOwner')});
        }
    }
};
