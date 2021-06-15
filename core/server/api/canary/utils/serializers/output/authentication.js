const i18n = require('../../../../../../shared/i18n');
const mapper = require('./utils/mapper');
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:authentication');

module.exports = {
    setup(user, apiConfig, frame) {
        frame.response = {
            users: [
                mapper.mapUser(user, {options: {context: {internal: true}}})
            ]
        };
    },

    updateSetup(user, apiConfig, frame) {
        frame.response = {
            users: [
                mapper.mapUser(user, {options: {context: {internal: true}}})
            ]
        };
    },

    isSetup(data, apiConfig, frame) {
        frame.response = {
            setup: [data]
        };
    },

    generateResetToken(data, apiConfig, frame) {
        frame.response = {
            passwordreset: [{
                message: i18n.t('common.api.authentication.mail.checkEmailForInstructions')
            }]
        };
    },

    resetPassword(data, apiConfig, frame) {
        frame.response = {
            passwordreset: [{
                message: i18n.t('common.api.authentication.mail.passwordChanged')
            }]
        };
    },

    acceptInvitation(data, apiConfig, frame) {
        debug('acceptInvitation');

        frame.response = {
            invitation: [
                {message: i18n.t('common.api.authentication.mail.invitationAccepted')}
            ]
        };
    },

    isInvitation(data, apiConfig, frame) {
        debug('acceptInvitation');

        frame.response = {
            invitation: [{
                valid: !!data
            }]
        };
    }
};
