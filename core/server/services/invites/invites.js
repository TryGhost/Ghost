const security = require('@tryghost/security');
const mailService = require('../../services/mail');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../services/settings/cache');
const logging = require('../../../shared/logging');
const {i18n} = require('../../lib/common');

const add = ({api, InviteModel, invites, options, user}) => {
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

            const adminUrl = urlUtils.urlFor('admin', true);

            emailData = {
                blogName: settingsCache.get('title'),
                invitedByName: user.name,
                invitedByEmail: user.email,
                resetLink: urlUtils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/')
            };

            return mailService.utils.generateContent({data: emailData, template: 'invite-user'});
        })
        .then((emailContent) => {
            const payload = {
                mail: [{
                    message: {
                        to: invite.get('email'),
                        subject: i18n.t('common.api.users.mail.invitedByName', {
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
                const errorMessage = i18n.t('errors.api.invites.errorSendingEmail.error', {
                    message: err.message
                });
                const helpText = i18n.t('errors.api.invites.errorSendingEmail.help');
                err.message = `${errorMessage} ${helpText}`;
                logging.warn(err.message);
            }

            return Promise.reject(err);
        });
};

module.exports.add = add;
