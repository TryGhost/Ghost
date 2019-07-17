const common = require('../../lib/common');
const models = require('../../models');
const security = require('../../lib/security');

async function accept(invitation) {
    const data = invitation.invitation[0];
    const inviteToken = security.url.decodeBase64(data.token);
    const options = {context: {internal: true}};

    let invite = await models.Invite.findOne({token: inviteToken, status: 'sent'}, options);

    if (!invite) {
        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteNotFound')});
    }

    if (invite.get('expires') < Date.now()) {
        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteExpired')});
    }

    await models.User.add({
        email: data.email,
        name: data.name,
        password: data.password,
        roles: [invite.toJSON().role_id]
    }, options);

    return invite.destroy(options);
}

module.exports = accept;
