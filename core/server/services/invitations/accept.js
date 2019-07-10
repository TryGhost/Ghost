const common = require('../../lib/common');
const models = require('../../models');
const security = require('../../lib/security');

function accept(invitation) {
    const data = invitation.invitation[0];
    const inviteToken = security.url.decodeBase64(data.token);
    const options = {context: {internal: true}};

    let invite;

    return models.Invite.findOne({token: inviteToken, status: 'sent'}, options)
        .then((_invite) => {
            invite = _invite;

            if (!invite) {
                throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteNotFound')});
            }

            if (invite.get('expires') < Date.now()) {
                throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteExpired')});
            }

            return models.User.add({
                email: data.email,
                name: data.name,
                password: data.password,
                roles: [invite.toJSON().role_id]
            }, options);
        })
        .then(() => {
            return invite.destroy(options);
        });
}

module.exports = accept;
