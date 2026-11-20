import { IncorrectUsageError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import * as security from '@tryghost/security';
import { defineService } from '@tryghost/kernel/define-service';
import { alias } from '../../../shared/service-alias';
import { createAuth, type GhostAuth } from './create-auth';
import { createSignInCodeEmail } from '../emails/sign-in-code';

export type { GhostAuth } from './create-auth';

// Built asynchronously, and read by code that cannot wait for it, so boot
// builds it from the services list, and only when auth:engine is better-auth.
// It reads admin_session_secret, which is ready whenever a service can be built.
export default alias(
  defineService({
    name: 'Better Auth',
    create: async ({ foundation }): Promise<GhostAuth> => {
      if (!foundation.database) {
        throw new IncorrectUsageError({ message: 'Better Auth needs a database.' });
      }
      return createGhostAuth(foundation.config, foundation.database.knex);
    },
  }),
);

async function createGhostAuth(
  config: { get(key: string): unknown },
  knex: import('knex').Knex,
): Promise<GhostAuth> {
  const settingsCache = require('../../../shared/settings-cache');
  const urlUtils = require('../../../shared/url-utils').default;
  const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');
  const { GhostMailer } = require('../../lib/mail');
  const { t } = require('../../../shared/i18n');
  const { blogIcon } = require('../../lib/image');

  const auth = createAuth({
    db: knex,
    secret: settingsCache.get('admin_session_secret'),
    sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs') as number,
    urlUtils,
    password: security.password,
    logger: logging,
    limiters: {
      globalBlock: spamPrevention.globalBlock,
      globalReset: spamPrevention.globalReset,
      userLogin: spamPrevention.userLogin,
      userReset: spamPrevention.userReset,
      sendVerificationCode: spamPrevention.sendVerificationCode,
      userVerification: spamPrevention.userVerification,
      verificationEmail: spamPrevention.verificationEmail,
    },
    // The legacy reset email and token, until the reset flow moves (plan Phase 2)
    async sendPasswordResetEmail(email) {
      const passwordreset = require('../passwordreset').default;
      const api = require('../../api').endpoints;
      const token = await passwordreset.generateToken(email, api.settings);
      await passwordreset.sendResetNotification(token, api.mail);
    },
    // Only `true` turns it on, as in `auth/session`
    isStaffDeviceVerificationEnabled: () => config.get('security:staffDeviceVerification') === true,
    isEmailMfaRequired: () => settingsCache.get('require_email_mfa') === true,
    sendDeviceVerificationCode: createSignInCodeEmail({
      mailer: new GhostMailer(),
      t,
      getSiteTitle: () => settingsCache.get('title'),
      getSiteLogo: () =>
        blogIcon.getIconUrl({ absolute: true, fallbackToDefault: false }) ||
        'https://static.ghost.org/v4.0.0/images/ghost-orb-1.png',
      getSiteUrl: () => urlUtils.urlFor('home', true),
    }),
    getRequestOrigin: (headers) =>
      require('../session').default.getOriginOfRequest({ headers: Object.fromEntries(headers) }),
  });
  // betterAuth() defers its setup to this promise; awaiting it fails boot, not the first request
  await auth.$context;
  return auth;
}
