const Promise = require('bluebird');
const validator = require('@tryghost/validator');
const debug = require('@tryghost/debug')('api:v2:utils:validators:input:invitation');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

module.exports = {
    acceptInvitation(apiConfig, frame) {
        debug('acceptInvitation');

        const data = frame.data.invitation[0];

        if (!data.token) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.authentication.noTokenProvided)}));
        }

        if (!data.email) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.authentication.noEmailProvided)}));
        }

        if (!data.password) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.authentication.noPasswordProvided)}));
        }

        if (!data.name) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.authentication.noNameProvided)}));
        }
    },

    isInvitation(apiConfig, frame) {
        debug('isInvitation');

        const email = frame.data.email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: tpl(messages.authentication.invalidEmailReceived)
            });
        }
    }
};
