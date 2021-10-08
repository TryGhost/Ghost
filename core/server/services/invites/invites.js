const security = require('@tryghost/security');

const messages = {
    invitedByName: '{invitedByName} has invited you to join {blogName}',
    errorSendingEmail: {
        error: 'Error sending email: {message}',
        help: 'Please check your email settings and resend the invitation.'
    }
};

class Invites {
    constructor({settingsCache, tpl, logging, mailService, urlUtils}) {
        this.settingsCache = settingsCache;
        this.tpl = tpl;
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
                    resetLink: this.urlUtils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/'),
                    recipientEmail: invite.get('email')
                };

                return this.mailService.utils.generateContent({data: emailData, template: 'invite-user'});
            })
            .then((emailContent) => {
                const payload = {
                    mail: [{
                        message: {
                            to: invite.get('email'),
                            subject: this.tpl(messages.invitedByName, {
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
                    const errorMessage = this.tpl(messages.errorSendingEmail.error, {
                        message: err.message
                    });
                    const helpText = this.tpl(messages.errorSendingEmail.help);
                    err.message = `${errorMessage} ${helpText}`;
                    this.logging.warn(err.message);
                }

                return Promise.reject(err);
            });
    }
}

module.exports = Invites;
