const Promise = require('bluebird');
const validator = require('@tryghost/validator');
const debug = require('@tryghost/debug')('api:canary:utils:validators:input:passwordreset');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    newPasswordsDoNotMatch: 'Your new passwords do not match',
    invalidEmailReceived: 'The server did not receive a valid email'
};

module.exports = {
    resetPassword(apiConfig, frame) {
        debug('resetPassword');

        const data = frame.data.passwordreset[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.newPasswordsDoNotMatch)
            }));
        }
    },

    generateResetToken(apiConfig, frame) {
        debug('generateResetToken');

        const email = frame.data.passwordreset[0].email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmailReceived)
            });
        }
    }
};
