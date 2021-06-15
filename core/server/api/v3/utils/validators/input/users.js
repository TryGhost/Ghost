const Promise = require('bluebird');
const debug = require('@tryghost/debug')('api:v3:utils:validators:input:users');
const i18n = require('../../../../../../shared/i18n');
const errors = require('@tryghost/errors');

module.exports = {
    changePassword(apiConfig, frame) {
        debug('changePassword');

        const data = frame.data.password[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new errors.ValidationError({
                message: i18n.t('errors.models.user.newPasswordsDoNotMatch')
            }));
        }
    }
};
