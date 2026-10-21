const security = require('@tryghost/security');
const tpl = require('@tryghost/tpl');
const accept = require('./accept');
const errors = require('@tryghost/errors');

const messages = {
  invitedByName: '{invitedByName} has invited you to join {blogName}',
  invitedByNoName: 'You have been invited to join {blogName}',
  errorSendingEmail: {
    error: 'Error sending email: {message}',
    help: 'Please check your email settings and resend the invitation.',
  },
};

class Invites {
  constructor({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
    invitationLimiter,
    limitService,
  }) {
    this.settingsCache = settingsCache;
    this.settingsHelpers = settingsHelpers;
    this.mailService = mailService;
    this.urlUtils = urlUtils;
    this.models = models;
    this.logging = logging;
    this.invitationLimiter = invitationLimiter;
    this.limitService = limitService;
  }

  rateLimit() {
    return this.invitationLimiter.rateLimit();
  }

  accept(invitation) {
    return accept(invitation, this.models, (transaction) =>
      this.invitationLimiter.lockStaffUsage(transaction),
    );
  }

  add({ api, InviteModel, invites, options, user }) {
    let invite;
    let emailData;

    const replace = async (transacting) => {
      const writeOptions = { ...options, transacting, forUpdate: true };
      const existingInvite = await InviteModel.findOne({ email: invites[0].email }, writeOptions);
      const registered = await this.models.User.findOne({ email: invites[0].email }, writeOptions);
      if (registered) {
        throw new errors.ValidationError({
          message: 'User is already registered.',
          code: 'USER_ALREADY_REGISTERED',
        });
      }
      if (existingInvite) {
        await existingInvite.destroy(writeOptions);
      }
      const role = await this.models.Role.findOne({ id: invites[0].role_id }, writeOptions);
      if (role.get('name') !== 'Contributor' && this.limitService.isLimited('staff')) {
        await this.limitService.errorIfWouldGoOverLimit('staff', { transacting });
      }
      return InviteModel.add(invites[0], writeOptions);
    };

    return this.invitationLimiter
      .run(invites[0].email, (transacting) => {
        const inviteOptions = transacting ? { ...options, transacting } : options;
        const createInvite = transacting
          ? replace(transacting)
          : this.limitService.isLimited('staff')
            ? this.models.Base.transaction(replace)
            : InviteModel.findOne({ email: invites[0].email }, inviteOptions)
                .then((existingInvite) => {
                  if (!existingInvite) {
                    return;
                  }

                  return existingInvite.destroy(inviteOptions);
                })
                .then(() => {
                  return InviteModel.add(invites[0], inviteOptions);
                });
        return createInvite
          .then((createdInvite) => {
            invite = createdInvite;

            const adminUrl = this.urlUtils.urlFor('admin', true);

            if (user.name || user.email) {
              emailData = {
                blogName: this.settingsCache.get('title'),
                invitedByName: user.name,
                invitedByEmail: user.email,
                resetLink: this.urlUtils.urlJoin(
                  adminUrl,
                  'signup',
                  security.url.encodeBase64(invite.get('token')),
                  '/',
                ),
                recipientEmail: invite.get('email'),
              };

              return this.mailService.utils.generateContent({
                data: emailData,
                template: 'invite-user',
              });
            } else {
              emailData = {
                blogName: this.settingsCache.get('title'),
                invitedByEmail: `ghost@${this.settingsHelpers.getDefaultEmailDomain()}`,
                resetLink: this.urlUtils.urlJoin(
                  adminUrl,
                  'signup',
                  security.url.encodeBase64(invite.get('token')),
                  '/',
                ),
                recipientEmail: invite.get('email'),
              };

              return this.mailService.utils.generateContent({
                data: emailData,
                template: 'invite-user-by-api-key',
              });
            }
          })
          .then((emailContent) => {
            const payload = {
              mail: [
                {
                  message: {
                    to: invite.get('email'),
                    replyTo: emailData.invitedByEmail,
                    subject: emailData.invitedByName
                      ? tpl(messages.invitedByName, {
                          invitedByName: emailData.invitedByName,
                          blogName: emailData.blogName,
                        })
                      : tpl(messages.invitedByNoName, {
                          blogName: emailData.blogName,
                        }),
                    html: emailContent.html,
                    text: emailContent.text,
                  },
                  options: {},
                },
              ],
            };

            return payload;
          });
      })
      .then((payload) => api.mail.send(payload, { context: { internal: true } }))
      .then(() => {
        return InviteModel.edit(
          {
            status: 'sent',
          },
          Object.assign({ id: invite.id }, options),
        );
      })
      .then((editedInvite) => {
        return editedInvite;
      })
      .catch((err) => {
        if (err && err.errorType === 'EmailError') {
          const errorMessage = tpl(messages.errorSendingEmail.error, {
            message: err.message,
          });
          const helpText = tpl(messages.errorSendingEmail.help);
          err.message = `${errorMessage} ${helpText}`;
          this.logging.warn(err.message);
        }

        return Promise.reject(err);
      });
  }
}

module.exports = Invites;
