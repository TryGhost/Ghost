import type { Knex } from 'knex';
import type { limitService } from '../limits';
import * as errors from '@tryghost/errors';
import type InvitationLimiter from './invitation-limiter';
import * as security from '@tryghost/security';
import tpl from '@tryghost/tpl';
import { accept, type AcceptanceModels, type Invitation } from './accept';

type Invite = {
  id: string;
  get(key: 'token' | 'email'): string;
};

type InviteData = { email: string; role_id: string };
type InviteOptions = Record<string, unknown>;
type InviteEmailData = {
  blogName: string;
  invitedByName?: string;
  invitedByEmail?: string;
  resetLink: string;
  recipientEmail: string;
};

type Dependencies = {
  invitationLimiter: InvitationLimiter;
  limitService: typeof limitService;
  settingsCache: { get(key: 'title'): string };
  settingsHelpers: { getDefaultEmailDomain(): string };
  mailService: {
    utils: {
      generateContent(options: {
        data: InviteEmailData;
        template: 'invite-user' | 'invite-user-by-api-key';
      }): Promise<{ html: string; text: string }>;
    };
  };
  urlUtils: {
    urlFor(context: 'admin', absolute: true): string;
    urlJoin(...parts: string[]): string;
  };
  models: AcceptanceModels & {
    User: { findOne(data: { email: string }, options: InviteOptions): Promise<unknown> };
    Role: {
      findOne(data: { id: string }, options: InviteOptions): Promise<{ get(key: 'name'): string }>;
    };
  };
  logging: { warn(message: string): void };
};

type AddInviteRequest = {
  api: {
    mail: {
      send(
        payload: {
          mail: Array<{
            message: {
              to: string;
              replyTo?: string;
              subject: string;
              html: string;
              text: string;
            };
            options: Record<string, never>;
          }>;
        },
        options: { context: { internal: true } },
      ): Promise<unknown>;
    };
  };
  InviteModel: {
    findOne(
      data: { email: string },
      options: InviteOptions,
    ): Promise<{ destroy(options: InviteOptions): Promise<unknown> } | null>;
    add(data: InviteData, options: InviteOptions): Promise<Invite>;
    edit(data: { status: 'sent' }, options: InviteOptions & { id: string }): Promise<Invite>;
  };
  invites: InviteData[];
  options: InviteOptions;
  user: { name?: string; email?: string };
};

const messages = {
  invitedByName: '{invitedByName} has invited you to join {blogName}',
  invitedByNoName: 'You have been invited to join {blogName}',
  errorSendingEmail: {
    error: 'Error sending email: {message}',
    help: 'Please check your email settings and resend the invitation.',
  },
};

export class Invites {
  private readonly settingsCache: Dependencies['settingsCache'];
  private readonly settingsHelpers: Dependencies['settingsHelpers'];
  private readonly mailService: Dependencies['mailService'];
  private readonly urlUtils: Dependencies['urlUtils'];
  private readonly models: Dependencies['models'];
  private readonly logging: Dependencies['logging'];
  private readonly invitationLimiter: InvitationLimiter;
  private readonly limitService: typeof limitService;

  constructor({
    settingsCache,
    settingsHelpers,
    mailService,
    urlUtils,
    models,
    logging,
    invitationLimiter,
    limitService,
  }: Dependencies) {
    this.settingsCache = settingsCache;
    this.settingsHelpers = settingsHelpers;
    this.mailService = mailService;
    this.urlUtils = urlUtils;
    this.models = models;
    this.logging = logging;
    this.invitationLimiter = invitationLimiter;
    this.limitService = limitService;
  }

  accept(invitation: Invitation) {
    return accept(invitation, this.models, (transaction) =>
      this.invitationLimiter.lockStaffUsage(transaction),
    );
  }

  add({ api, InviteModel, invites, options, user }: AddInviteRequest): Promise<Invite> {
    let invite: Invite;
    let emailData: InviteEmailData;

    const replace = async (transacting: Knex.Transaction) => {
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
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === 'object' &&
          'errorType' in err &&
          err.errorType === 'EmailError' &&
          'message' in err
        ) {
          const errorMessage = tpl(messages.errorSendingEmail.error, {
            message: err.message,
          });
          const helpText = tpl(messages.errorSendingEmail.help);
          const message = `${errorMessage} ${helpText}`;
          err.message = message;
          this.logging.warn(message);
        }

        return Promise.reject(err);
      });
  }
}
