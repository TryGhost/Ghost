const common = require('../../../../../lib/common');
const mapper = require('./utils/mapper');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:authentication');

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
                message: common.i18n.t('common.api.authentication.mail.checkEmailForInstructions')
            }]
        };
    },

    resetPassword(data, apiConfig, frame) {
        frame.response = {
            passwordreset: [{
                message: common.i18n.t('common.api.authentication.mail.passwordChanged')
            }]
        };
    },

    acceptInvitation(data, apiConfig, frame) {
        debug('acceptInvitation');

        frame.response = {
            invitation: [
                {message: common.i18n.t('common.api.authentication.mail.invitationAccepted')}
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
