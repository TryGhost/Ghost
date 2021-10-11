const Promise = require('bluebird');
const debug = require('@tryghost/debug')('api:v3:utils:validators:input:users');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    newPasswordsDoNotMatch: 'Your new passwords do not match'
};

module.exports = {
    changePassword(apiConfig, frame) {
        debug('changePassword');

        const data = frame.data.password[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.newPasswordsDoNotMatch)
            }));
        }
    }
};
