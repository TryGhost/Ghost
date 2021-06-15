const debug = require('@tryghost/debug')('api:canary:utils:validators:input:updateSetup');
const i18n = require('../../../../../../shared/i18n');
const errors = require('@tryghost/errors');

module.exports = {
    updateSetup(apiConfig, frame) {
        debug('resetPassword');

        if (!frame.options.context || !frame.options.context.user) {
            throw new errors.NoPermissionError({message: i18n.t('errors.api.authentication.notTheBlogOwner')});
        }
    }
};
