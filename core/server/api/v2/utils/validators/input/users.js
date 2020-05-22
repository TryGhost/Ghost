const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:users');
const {i18n} = require('../../../../../lib/common');
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
