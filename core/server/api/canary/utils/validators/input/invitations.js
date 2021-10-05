const Promise = require('bluebird');
const validator = require('@tryghost/validator');
const debug = require('@tryghost/debug')('api:canary:utils:validators:input:invitation');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    noEmailProvided: 'No email provided.',
    noNameProvided: 'No name provided.',
    noPasswordProvided: 'No password provided.',
    noTokenProvided: 'No token provided.',
    invalidEmailReceived: 'The server did not receive a valid email'
};

module.exports = {
    acceptInvitation(apiConfig, frame) {
        debug('acceptInvitation');

        const data = frame.data.invitation[0];

        if (!data.token) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.noTokenProvided)}));
        }

        if (!data.email) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.noEmailProvided)}));
        }

        if (!data.password) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.noPasswordProvided)}));
        }

        if (!data.name) {
            return Promise.reject(new errors.ValidationError({message: tpl(messages.noNameProvided)}));
        }
    },

    isInvitation(apiConfig, frame) {
        debug('isInvitation');

        const email = frame.data.email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidEmailReceived)
            });
        }
    }
};
