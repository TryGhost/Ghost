const Promise = require('bluebird');
const validator = require('validator');
const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:passwordreset');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');

module.exports = {
    resetPassword(apiConfig, frame) {
        debug('resetPassword');

        const data = frame.data.passwordreset[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new errors.ValidationError({
                message: i18n.t('errors.models.user.newPasswordsDoNotMatch')
            }));
        }
    },

    generateResetToken(apiConfig, frame) {
        debug('generateResetToken');

        const email = frame.data.passwordreset[0].email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: i18n.t('errors.api.authentication.invalidEmailReceived')
            });
        }
    }
};
