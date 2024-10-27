/* eslint-disable ghost/filenames/match-regex */
const validator = require('@tryghost/validator');
const debug = require('@tryghost/debug')('api:endpoints:utils:validators:input:passwordreset');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    newPasswordsDoNotMatch: 'Your new passwords do not match',
    invalidEmailReceived: 'The server did not receive a valid email'
};

module.exports = {
    resetPassword(apiConfig, frame) {
        debug('resetPassword');

        const data = frame.data.password_reset[0];

        if (data.newPassword !== data.ne2Password) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.newPasswordsDoNotMatch)
            }));
        }
    },

    generateResetToken(apiConfig, frame) {
        debug('generateResetToken');

        const email = frame.data.password_reset?.[0]?.email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmailReceived)
            });
        }
    }
};
