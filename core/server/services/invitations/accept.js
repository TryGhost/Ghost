const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const models = require('../../models');
const security = require('@tryghost/security');

async function accept(invitation) {
    const data = invitation.invitation[0];
    const inviteToken = security.url.decodeBase64(data.token);
    const options = {context: {internal: true}};

    let invite = await models.Invite.findOne({token: inviteToken, status: 'sent'}, options);

    if (!invite) {
        throw new errors.NotFoundError({message: i18n.t('errors.api.invites.inviteNotFound')});
    }

    if (invite.get('expires') < Date.now()) {
        throw new errors.NotFoundError({message: i18n.t('errors.api.invites.inviteExpired')});
    }

    let user = await models.User.findOne({email: data.email});
    if (user) {
        throw new errors.ValidationError({
            message: i18n.t('errors.api.invites.inviteEmailAlreadyExist.message'),
            context: i18n.t('errors.api.invites.inviteEmailAlreadyExist.context'),
            help: i18n.t('errors.api.invites.inviteEmailAlreadyExist.help')
        });
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
