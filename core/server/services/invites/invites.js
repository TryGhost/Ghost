const security = require('@tryghost/security');

class Invites {
    constructor({settingsCache, i18n, logging, mailService, urlUtils}) {
        this.settingsCache = settingsCache;
        this.i18n = i18n;
        this.logging = logging;
        this.mailService = mailService;
        this.urlUtils = urlUtils;
    }

    add({api, InviteModel, invites, options, user}) {
        let invite;
        let emailData;

        return InviteModel.findOne({email: invites[0].email}, options)
            .then((existingInvite) => {
                if (!existingInvite) {
                    return;
                }

                return existingInvite.destroy(options);
            })
            .then(() => {
                return InviteModel.add(invites[0], options);
            })
            .then((createdInvite) => {
                invite = createdInvite;

                const adminUrl = this.urlUtils.urlFor('admin', true);

                emailData = {
                    blogName: this.settingsCache.get('title'),
                    invitedByName: user.name,
                    invitedByEmail: user.email,
                    resetLink: this.urlUtils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/')
                };

                return this.mailService.utils.generateContent({data: emailData, template: 'invite-user'});
            })
            .then((emailContent) => {
                const payload = {
                    mail: [{
                        message: {
                            to: invite.get('email'),
                            subject: this.i18n.t('common.api.users.mail.invitedByName', {
                                invitedByName: emailData.invitedByName,
                                blogName: emailData.blogName
                            }),
                            html: emailContent.html,
                            text: emailContent.text
                        },
                        options: {}
                    }]
                };

                return api.mail.send(payload, {context: {internal: true}});
            })
            .then(() => {
                return InviteModel.edit({
                    status: 'sent'
                }, Object.assign({id: invite.id}, options));
            })
            .then((editedInvite) => {
                return editedInvite;
            })
            .catch((err) => {
                if (err && err.errorType === 'EmailError') {
                    const errorMessage = this.i18n.t('errors.api.invites.errorSendingEmail.error', {
                        message: err.message
                    });
                    const helpText = this.i18n.t('errors.api.invites.errorSendingEmail.help');
                    err.message = `${errorMessage} ${helpText}`;
                    this.logging.warn(err.message);
                }

                return Promise.reject(err);
            });
    }
}

module.exports = Invites;
