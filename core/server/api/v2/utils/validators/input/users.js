const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:users');
const common = require('../../../../../lib/common');

module.exports = {
    changePassword(apiConfig, frame) {
        debug('changePassword');

        const data = frame.data.password[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.models.user.newPasswordsDoNotMatch')
            }));
        }
    }
};
