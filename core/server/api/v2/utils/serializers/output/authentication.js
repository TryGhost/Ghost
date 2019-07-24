const common = require('../../../../../lib/common');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:authentication');

module.exports = {
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
