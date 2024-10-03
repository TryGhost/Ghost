const tpl = require('@tryghost/tpl');
const mappers = require('./mappers');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:authentication');

const messages = {
    checkEmailForInstructions: 'Check your email for further instructions.',
    passwordChanged: 'Password updated',
    invitationAccepted: 'Invitation accepted.'
};

module.exports = {
    setup(user, apiConfig, frame) {
        frame.response = {
            users: [
                mappers.users(user, {options: {context: {internal: true}}})
            ]
        };
    },

    updateSetup(user, apiConfig, frame) {
        frame.response = {
            users: [
                mappers.users(user, {options: {context: {internal: true}}})
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
            password_reset: [{
                message: tpl(messages.checkEmailForInstructions)
            }]
        };
    },

    resetPassword(data, apiConfig, frame) {
        frame.response = {
            password_reset: [{
                message: tpl(messages.passwordChanged)
            }]
        };
    },

    acceptInvitation(data, apiConfig, frame) {
        debug('acceptInvitation');

        frame.response = {
            invitation: [
                {message: tpl(messages.invitationAccepted)}
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
