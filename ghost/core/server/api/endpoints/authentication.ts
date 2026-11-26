import { defineMethod, resourceBody, type Frame } from '@tryghost/api-framework';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import auth from '../../auth';
import adapterManager from '../../services/adapter-manager';
import invites from '../../services/invites';
import usersService from '../../services/users';
import type { Req as SessionRequest } from '../../auth/session/session-service';
import type { SpamPrevention } from '../../web/shared/middleware/api/spam-prevention';

const api = require('./index');
const models = require('../../models');
const spamPrevention: SpamPrevention = require('../../web/shared/middleware/api/spam-prevention');

const schedulerAdapter = adapterManager.getAdapter('scheduling');

// Chosen once at load, as in auth/authenticate.ts
const isBetterAuth = auth.isBetterAuth;

type GenerateResetTokenFrame = Frame<{ data: { password_reset: [{ email: string }] } }>;

type ResetPasswordFrame = Frame<{
  data: Parameters<typeof auth.passwordreset.extractTokenParts>[0]['data'];
  options: { ip?: string; userAgent?: string };
}>;

type AcceptInvitationFrame = Frame<{
  data: Parameters<typeof invites.service.accept>[0];
}>;

type IsInvitationFrame = Frame<{ data: { email: string } }>;

type RequestSession = {
  req: SessionRequest & { session?: { destroy(callback: (err?: unknown) => void): void } };
};

// The Express session the legacy engine attaches to the request
function requestSession(frame: Frame): RequestSession | undefined {
  return frame.original.session as RequestSession | undefined;
}

async function destroyRequestSession(req?: RequestSession['req']) {
  if (!req || !req.session) {
    return;
  }
  const session = req.session;
  await new Promise<void>((resolve, reject) => {
    session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

const messages = {
  notTheBlogOwner: 'You are not the site owner.',
};

const controller = {
  docName: 'authentication',

  setup: defineMethod({
    statusCode: 201,
    permissions: false,
    headers: {
      cacheInvalidate: true,
    },
    schema: {
      body: resourceBody('setup', auth.setup.setupDetailsSchema),
    },
    async handler(frame) {
      await auth.setup.assertSetupCompleted(false)();

      const setupDetails = { ...frame.body, status: 'active' };
      let data = await auth.setup.setupUser(setupDetails);

      data = await auth.setup.doFixtures(data);
      data = await auth.setup.doProductAndNewsletter(data, api);
      data = await auth.setup.installTheme(data, api);
      const user = await auth.setup.doSettings(data, api.settings);

      auth.setup.sendWelcomeEmail(user.get('email'), api.mail).catch((err) => {
        logging.error(err);
      });

      return user;
    },
  }),

  updateSetup: defineMethod({
    headers: {
      cacheInvalidate: true,
    },
    permissions: async (frame) => {
      const owner = await models.User.findOne({ role: 'Owner', status: 'all' });
      if (owner.id !== frame.context.user) {
        throw new errors.NoPermissionError({ message: tpl(messages.notTheBlogOwner) });
      }
    },
    schema: {
      body: resourceBody('setup', auth.setup.updateSetupDetailsSchema),
    },
    async handler(frame) {
      await auth.setup.assertSetupCompleted(true)();

      const { name, email, password, blogTitle } = frame.body;
      const setupDetails = { name, email, password, blogTitle, status: 'active' };

      const data = await auth.setup.setupUser(setupDetails);
      return auth.setup.doSettings(data, api.settings);
    },
  }),

  isSetup: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    async query() {
      const isSetup = await auth.setup.checkIsSetup();

      if (isSetup) {
        return {
          status: true,
        };
      }

      return {
        status: false,
      };
    },
  },

  generateResetToken: {
    headers: {
      cacheInvalidate: false,
    },
    validation: {
      docName: 'password_reset',
    },
    permissions: true,
    options: ['email'],
    async query(frame: GenerateResetTokenFrame) {
      await auth.setup.assertSetupCompleted(true)();
      const token = await auth.passwordreset.generateToken(
        frame.data.password_reset[0].email,
        api.settings,
      );
      return auth.passwordreset.sendResetNotification(token, api.mail);
    },
  },

  resetPassword: {
    headers: {
      cacheInvalidate: false,
    },
    validation: {
      docName: 'password_reset',
      data: {
        newPassword: { required: true },
        ne2Password: { required: true },
      },
    },
    permissions: false,
    options: ['ip', 'userAgent'],
    async query(frame: ResetPasswordFrame) {
      await auth.setup.assertSetupCompleted(true)();
      const { options, tokenParts } = await auth.passwordreset.extractTokenParts(frame);
      const internalOptions = Object.assign(options, { context: { internal: true } });

      const doResetParams = await auth.passwordreset.doReset(
        internalOptions,
        tokenParts,
        api.settings,
      );

      if (isBetterAuth) {
        // Signs the user out everywhere, then in here, verified (plan §5.1)
        const userId = doResetParams.user.id;
        await auth.staffSessions.revokeUserSessions(userId);
        frame.setHeader(
          'Set-Cookie',
          await auth.staffSessions.createVerifiedSession(userId, {
            ipAddress: frame.options.ip,
            userAgent: frame.options.userAgent,
          }),
        );
      } else {
        const session = requestSession(frame);
        if (!session) {
          throw new errors.InternalServerError({
            message: 'Could not initialize an admin session during password reset.',
          });
        }

        // Rotate the session_id and mint a fresh verified session so that
        // any stolen or cloned copy of the pre-reset cookie is rejected
        // on its next request.
        await auth.session.sessionService.rotateAndAssignVerifiedUserToSession({
          req: session.req,
          user: doResetParams.user,
          ip: frame.options.ip,
        });
      }

      // userLogin counts per IP, so clear this IP's failed sign-ins
      spamPrevention
        .userLogin()
        .reset({ ip: frame.options.ip })
        .catch((err: unknown) => logging.error(err));
      return {};
    },
  },

  acceptInvitation: {
    headers: {
      cacheInvalidate: false,
    },
    validation: {
      docName: 'invitations',
    },
    permissions: false,
    async query(frame: AcceptInvitationFrame) {
      await auth.setup.assertSetupCompleted(true)();
      return invites.service.accept(frame.data);
    },
  },

  isInvitation: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['email'],
    validation: {
      docName: 'invitations',
    },
    permissions: false,
    async query(frame: IsInvitationFrame) {
      await auth.setup.assertSetupCompleted(true)();
      const email = frame.data.email;
      return models.Invite.findOne({ email, status: 'sent' }, frame.options);
    },
  },

  reset: {
    statusCode: 200,
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    async query(frame: Frame) {
      const result = await auth.resetAuthentication({
        schedulerAdapter,
        userService: usersService.service,
        options: frame.options,
        // Under legacy too, so a later switch to better-auth can't revive them
        revokeAllSessions: isBetterAuth
          ? () => auth.staffSessions.revokeAllSessions()
          : () => models.Base.knex('user_sessions').del(),
      });

      // Express-session would otherwise re-save the current request's
      // session on the response, resurrecting the row deleteAllSessions
      // just wiped. Destroying the request session prevents the re-save
      // and emits a Set-Cookie that expires the cookie on the client.
      await destroyRequestSession(requestSession(frame)?.req);

      return result;
    },
  },
};

export default controller;
