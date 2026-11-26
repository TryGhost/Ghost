import { IncorrectUsageError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import * as security from '@tryghost/security';
import { createAuth, type GhostAuth } from './create-auth';
import { createSignInCodeEmail } from '../emails/sign-in-code';
import { APP_OAUTH_TABLES } from './plugins/apps';

export type { GhostAuth } from './create-auth';

/** Builds Better Auth from Ghost's settings, config and database. Starts nothing and awaits nothing. */
function build(): GhostAuth {
  const config = require('../../../shared/config');
  const settingsCache = require('../../../shared/settings-cache');
  const urlUtils = require('../../../shared/url-utils').default;
  const { knex } = require('../../data/db');
  const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');
  const { GhostMailer } = require('../../lib/mail');
  const { t } = require('../../../shared/i18n');
  const { blogIcon } = require('../../lib/image');
  const labs = require('../../../shared/labs');
  const { getTables } = require('../../data/schema/commands');

  // In-development tables exist only in development and testing databases
  const hasAppTables = async () => {
    const tables: string[] = await getTables(knex);
    const missing = APP_OAUTH_TABLES.filter((table) => !tables.includes(table));
    if (missing.length) {
      logging.warn(
        `Apps are turned on, but their tables are missing, so apps can't open: ${missing.join(', ')}`,
      );
    }
    return !missing.length;
  };
  const apps = labs.isSet('apps') && (await hasAppTables());

  return createAuth({
    db: knex,
    secret: settingsCache.get('admin_session_secret'),
    sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
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
    apps,
  });
}

let instance: GhostAuth | undefined;
let starting: Promise<void> | undefined;

/**
 * Staff authentication under `auth:engine: better-auth`: a piece of auth infrastructure that boot
 * starts explicitly, not a service root. It is built only under its engine, and its readers (the
 * Admin API app, the session endpoint, staff sessions, Stripe Connect state and `authenticate`)
 * read `instance` synchronously, so they cannot wait for it.
 *
 * Building is synchronous. The one thing to await is Better Auth's own deferred setup, which
 * `start()` does, so a bad setup fails boot and not the first request. Boot calls `start()` after
 * settings, which it reads the session secret from, and only under the engine.
 */
const betterAuth = {
  /**
   * Builds the instance and waits for its setup. Overlapping and later calls share the first
   * successful start: the instance is built once per process. A failed start keeps nothing, so
   * the next call builds again.
   */
  start(): Promise<void> {
    starting ??= (async () => {
      const built = build();
      // betterAuth() defers its setup to this promise; awaiting it fails boot, not the first request
      await built.$context;
      instance = built;
    })().catch((error: unknown) => {
      starting = undefined;
      throw error;
    });
    return starting;
  },

  /** The started instance. Throws before `start()` has succeeded, as under the legacy engine. */
  get instance(): GhostAuth {
    if (instance === undefined) {
      throw new IncorrectUsageError({
        message: 'Better Auth used before start(). Boot starts it under auth:engine better-auth.',
      });
    }
    return instance;
  },
};

export default betterAuth;
