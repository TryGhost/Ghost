const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:updateSetup');
const common = require('../../../../../lib/common');

module.exports = {
    updateSetup(apiConfig, frame) {
        debug('resetPassword');

        if (!frame.options.context || !frame.options.context.user) {
            throw new common.errors.NoPermissionError({message: common.i18n.t('errors.api.authentication.notTheBlogOwner')});
        }
    }
};
