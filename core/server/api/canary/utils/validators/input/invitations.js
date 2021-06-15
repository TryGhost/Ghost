const Promise = require('bluebird');
const validator = require('@tryghost/validator');
const debug = require('@tryghost/debug')('api:canary:utils:validators:input:invitation');
const i18n = require('../../../../../../shared/i18n');
const errors = require('@tryghost/errors');

module.exports = {
    acceptInvitation(apiConfig, frame) {
        debug('acceptInvitation');

        const data = frame.data.invitation[0];

        if (!data.token) {
            return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.authentication.noTokenProvided')}));
        }

        if (!data.email) {
            return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.authentication.noEmailProvided')}));
        }

        if (!data.password) {
            return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.authentication.noPasswordProvided')}));
        }

        if (!data.name) {
            return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.authentication.noNameProvided')}));
        }
    },

    isInvitation(apiConfig, frame) {
        debug('isInvitation');

        const email = frame.data.email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new errors.BadRequestError({
                message: i18n.t('errors.api.authentication.invalidEmailReceived')
            });
        }
    }
};
