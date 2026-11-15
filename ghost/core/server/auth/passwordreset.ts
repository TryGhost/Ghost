import type { Knex } from 'knex';
import _ from 'lodash';
import security from '@tryghost/security';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import moment from 'moment';
import urlUtils from '../../shared/url-utils';

const models = require('../models');
// require, not import: tests override config through the require graph
const {
  readPasswordHash,
}: typeof import('./better-auth/credential-password') = require('./better-auth/credential-password');
const ghostBookshelf = require('../models/base');
const mail = require('../lib/mail');

type ResetUser = { id: string; get(key: 'password'): string; isInactive(): boolean };

const messages = {
  userNotFound: 'User not found.',
  userSuspended: 'This account has been suspended.',
  resetPassword: 'Reset Password',
  expired: {
    message: 'Cannot reset password.',
    context: 'Password reset link expired.',
    help: 'Request a new password reset via the login form.',
  },
  invalidToken: {
    message: 'Cannot reset password.',
    context: 'Password reset link has already been used.',
    help: 'Request a new password reset via the login form.',
  },
  corruptedToken: {
    message: 'Cannot reset password.',
    context: 'Invalid password reset link.',
    help: 'Check if password reset link has been fully copied or request new password reset via the login form.',
  },
};

interface SettingsAPI {
  read(options: Record<string, unknown>): Promise<{ settings: Array<{ value: string }> }>;
}

interface MailAPI {
  send(payload: unknown, options: Record<string, unknown>): Promise<unknown>;
}

interface PasswordResetOptions {
  context?: Record<string, unknown>;
  data: {
    password_reset: Array<{ token: string; oldPassword?: string; newPassword: string }>;
  };
}

interface TokenParts {
  expires: number;
  email: string;
}

function generateToken(
  email: string,
  settingsAPI: SettingsAPI,
  transaction?: Knex.Transaction,
): Promise<{ email: string; resetToken: string }> {
  const options = { context: { internal: true }, transacting: transaction };
  let dbHash: string;
  let token: string;

  return settingsAPI
    .read(_.merge({ key: 'db_hash' }, options))
    .then((response) => {
      dbHash = response.settings[0].value;

      return models.User.getByEmail(email, options);
    })
    .then(async (user: ResetUser | null) => {
      if (!user) {
        throw new errors.NotFoundError({ message: tpl(messages.userNotFound) });
      }

      // Prevent suspended users from generating a reset token. This same check must appear
      // below in doReset() to account for password reset tokens that were generated prior
      // to suspension since they have a 24-hour lifetime.
      // Locked users must still be able to recover access by resetting their password.
      if (user.isInactive()) {
        throw new errors.NoPermissionError({ message: tpl(messages.userSuspended) });
      }

      token = security.tokens.resetToken.generateHash({
        expires: moment().add(1, 'days').valueOf(),
        email: email,
        dbHash: dbHash,
        passwordHash: await readPasswordHash(transaction || ghostBookshelf.knex, {
          id: user.id,
          password: user.get('password'),
        }),
      });

      return {
        email: email,
        resetToken: token,
      };
    });
}

function extractTokenParts(
  options: PasswordResetOptions,
): Promise<{ options: PasswordResetOptions; tokenParts: TokenParts }> {
  options.data.password_reset[0].token = security.url.decodeBase64(
    options.data.password_reset[0].token,
  );

  const tokenParts = security.tokens.resetToken.extract({
    token: options.data.password_reset[0].token,
  });

  if (!tokenParts) {
    return Promise.reject(
      new errors.UnauthorizedError({
        message: tpl(messages.corruptedToken.message),
        context: tpl(messages.corruptedToken.context),
        help: tpl(messages.corruptedToken.help),
      }),
    );
  }

  return Promise.resolve({ options, tokenParts });
}

function doReset(
  options: PasswordResetOptions,
  tokenParts: TokenParts,
  settingsAPI: SettingsAPI,
): Promise<{ user: unknown }> {
  const data = options.data.password_reset[0];
  const resetToken = data.token;
  const oldPassword = data.oldPassword;
  const newPassword = data.newPassword;

  return ghostBookshelf
    .transaction(async (transacting: Knex.Transaction) => {
      const txOptions = { context: options.context, transacting };

      const settingsResponse = await settingsAPI.read({ key: 'db_hash', ...txOptions });
      const dbHash = settingsResponse.settings[0].value;

      const candidate = await models.User.getByEmail(tokenParts.email, txOptions);
      if (!candidate) {
        throw new errors.NotFoundError({ message: tpl(messages.userNotFound) });
      }

      const user = await new models.User({ id: candidate.id }).fetch({
        ...txOptions,
        forUpdate: true,
        require: true,
      });

      // Better Auth writes the credential row without touching users, so lock it too
      const passwordHash = await readPasswordHash(
        transacting,
        { id: user.id, password: user.get('password') },
        { forUpdate: true },
      );
      const compareResult = security.tokens.resetToken.compare({
        token: resetToken,
        dbHash: dbHash,
        passwordHash,
      });

      if (!compareResult.correct) {
        if (compareResult.reason === 'expired' || compareResult.reason === 'invalid_expiry') {
          throw new errors.BadRequestError({
            message: tpl(messages.expired.message),
            context: tpl(messages.expired.context),
            help: tpl(messages.expired.help),
          });
        } else {
          throw new errors.BadRequestError({
            message: tpl(messages.invalidToken.message),
            context: tpl(messages.invalidToken.context),
            help: tpl(messages.invalidToken.help),
          });
        }
      }

      if (user.isInactive()) {
        throw new errors.NoPermissionError({ message: tpl(messages.userSuspended) });
      }

      const updatedUser = await models.User.changePassword(
        {
          oldPassword: oldPassword,
          newPassword: newPassword,
          user_id: user.id,
        },
        txOptions,
      );

      updatedUser.set('status', 'active');
      const savedUser = await updatedUser.save(null, txOptions);
      return { user: savedUser };
    })
    .catch((err: Error) => {
      if (errors.utils.isGhostError(err)) {
        return Promise.reject(err);
      }
      return Promise.reject(new errors.UnauthorizedError({ err: err }));
    });
}

async function sendResetNotification(
  data: { email: string; resetToken: string },
  mailAPI: MailAPI,
) {
  const adminUrl = urlUtils.urlFor('admin', true);
  const resetToken = security.url.encodeBase64(data.resetToken);
  const resetUrl = urlUtils.urlJoin(adminUrl, 'reset', resetToken, '/');
  const emailData = {
    resetUrl: resetUrl,
    recipientEmail: data.email,
  };

  const content = await mail.utils.generateContent({
    data: emailData,
    template: 'reset-password',
  });

  const payload = {
    mail: [
      {
        message: {
          to: data.email,
          subject: tpl(messages.resetPassword),
          html: content.html,
          text: content.text,
        },
        options: {},
      },
    ],
  };

  return mailAPI.send(payload, { context: { internal: true } });
}

export default {
  generateToken,
  extractTokenParts,
  doReset,
  sendResetNotification,
};
