const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('api:v2:utils:validators:input:invitation');
const common = require('../../../../../lib/common');

module.exports = {
    acceptInvitation(apiConfig, frame) {
        debug('acceptInvitation');

        const data = frame.data.invitation[0];

        if (!data.token) {
            return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noTokenProvided')}));
        }

        if (!data.email) {
            return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noEmailProvided')}));
        }

        if (!data.password) {
            return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noPasswordProvided')}));
        }

        if (!data.name) {
            return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noNameProvided')}));
        }
    }
};

