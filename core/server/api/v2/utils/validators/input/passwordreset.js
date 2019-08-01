const Promise = require('bluebird');
const validator = require('validator');
const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:passwordreset');
const common = require('../../../../../lib/common');

module.exports = {
    resetPassword(apiConfig, frame) {
        debug('resetPassword');

        const data = frame.data.passwordreset[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.models.user.newPasswordsDoNotMatch')
            }));
        }
    },

    generateResetToken(apiConfig, frame) {
        debug('generateResetToken');

        const email = frame.data.passwordreset[0].email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.authentication.invalidEmailReceived')
            });
        }
    }
};
