const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const security = require('@tryghost/security');

const messages = {
    inviteNotFound: 'Invite not found.',
    inviteExpired: 'Invite is expired.',
    inviteEmailAlreadyExist: {
        message: 'Could not create an account, email is already in use.',
        context: 'Attempting to create an account with existing email address.',
        help: 'Use different email address to register your account.'
    }
};

async function accept(invitation) {
    const data = invitation.invitation[0];
    const inviteToken = security.url.decodeBase64(data.token);

    return models.Base.transaction(async (transacting) => {
        const options = {context: {internal: true}, transacting, forUpdate: true};

        let invite = await models.Invite.findOne({token: inviteToken, status: 'sent'}, options);

        if (!invite) {
            throw new errors.NotFoundError({message: tpl(messages.inviteNotFound)});
        }

        if (invite.get('expires') < Date.now()) {
            throw new errors.NotFoundError({message: tpl(messages.inviteExpired)});
        }

        let user = await models.User.findOne({email: data.email}, options);
        if (user) {
            throw new errors.ValidationError({
                message: tpl(messages.inviteEmailAlreadyExist.message),
                context: tpl(messages.inviteEmailAlreadyExist.context),
                help: tpl(messages.inviteEmailAlreadyExist.help)
            });
        }

        const roleId = invite.get('role_id');

        await invite.destroy(options);

        await models.User.add({
            email: data.email,
            name: data.name,
            password: data.password,
            roles: [roleId]
        }, options);
    });
}

module.exports = accept;
