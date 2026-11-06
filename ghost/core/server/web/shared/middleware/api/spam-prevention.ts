import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import moment from 'moment';
import { RateLimiterMemory, RateLimiterMySQL, RateLimiterSQLite } from 'rate-limiter-flexible';
import config from '../../../../../shared/config';
import type { SpamBlock } from '../../../../../shared/config/schema/spam';
import { BackoffLimiter } from './backoff-limiter';
import type { BackoffOptions, LimiterFactory, StoreError } from './backoff-limiter';

const messages = {
  forgottenPasswordEmail: {
    error: 'Only {rfa} forgotten password attempts per email every {rfp} seconds.',
    context: 'Forgotten password reset attempt failed',
  },
  forgottenPasswordIp: {
    error: 'Only {rfa} tries per IP address every {rfp} seconds.',
    context: 'Forgotten password reset attempt failed',
  },
  tooManySigninAttempts: {
    error: 'Only {rateSigninAttempts} tries per IP address every {rateSigninPeriod} seconds.',
    context: 'Too many login attempts.',
  },
  tooManyAttempts: 'Too many attempts.',
  tooManyCheckoutAttempts: {
    context: 'Too many checkout attempts.',
  },
  tooManyOTCVerificationAttempts: {
    error: 'Too many attempts for this verification code.',
    context: 'Too many verification code attempts.',
  },
  webmentionsBlock: 'Too many mention attempts',
  emailPreviewBlock: 'Only 10 test emails can be sent per hour',
  upgradeBlock: 'Too many update requests. Try again in a minute.',
  staffInviteBlock: 'Too many invitation requests. Try again in a minute.',
};

const TABLE = 'rate_limits';
const CLEANUP_INTERVAL = 60 * 60 * 1000;

let databaseFactory: LimiterFactory | undefined;
let cleanupTimer: NodeJS.Timeout | undefined;
const instances = new Map<string, BackoffLimiter>();

const settingsFor = (block: SpamBlock) => config.get('spam')[block];

/** The attempts and period quoted in an error message; an hour if `lifetime` is unset. */
const quotedLimits = (block: SpamBlock) => {
  const { freeRetries, lifetime } = settingsFor(block);

  return {
    attempts: freeRetries + 1,
    period: lifetime || 60 * 60,
  };
};

const handleStoreError = (err: StoreError) => {
  const customError = new errors.InternalServerError({
    message: 'Unknown error',
    err: err.parent instanceof Error ? err.parent : undefined,
  });

  // resets have no request to fail, so they only log
  if (!err.next) {
    logging.error(err);
    return;
  }

  err.next(customError);
};

const memoryFactory: LimiterFactory = (options) => new RateLimiterMemory(options);

// required late, as before: loading db builds the knex instance
const getDb = (): typeof import('../../../../data/db') => require('../../../../data/db');

/** Deletes expired rows from every limiter. Runs hourly once a database limiter exists. */
const clearExpired = () => getDb().knex(TABLE).where('expire', '<', Date.now()).del();

/**
 * Limiters over the `rate_limits` table, built lazily because loading db builds
 * the knex instance. Ghost owns the table through a migration, and removes
 * expired rows on one timer rather than one per limiter.
 */
const databaseStore = (): LimiterFactory => {
  if (databaseFactory) {
    return databaseFactory;
  }

  const db = getDb();
  const { client, connection } = db.knex.client.config;
  const shared = {
    storeClient: db.knex,
    storeType: 'knex',
    tableName: TABLE,
    tableCreated: true,
    clearExpiredByTimeout: false,
  };

  databaseFactory = ['mysql', 'mysql2'].includes(client)
    ? (options) => new RateLimiterMySQL({ ...shared, dbName: connection.database, ...options })
    : (options) => new RateLimiterSQLite({ ...shared, ...options });

  cleanupTimer = setInterval(() => {
    clearExpired().catch((err: unknown) => logging.error(err));
  }, CLEANUP_INTERVAL).unref();

  return databaseFactory;
};

type LimiterOptions = Pick<BackoffOptions, 'attachResetToRequest' | 'failCallback'>;

/** One limiter per name, until reset(), reading its block from config when built. */
const limiter = (
  name: string,
  block: SpamBlock,
  options: LimiterOptions,
  { memory = false }: { memory?: boolean } = {},
): BackoffLimiter => {
  let instance = instances.get(name);

  if (!instance) {
    const { freeRetries, minWait, maxWait, lifetime } = settingsFor(block);

    instance = new BackoffLimiter(name, memory ? memoryFactory : databaseStore(), {
      handleStoreError,
      ...options,
      freeRetries,
      minWait,
      maxWait,
      lifetime,
    });
    instances.set(name, instance);
  }

  return instance;
};

/** A limiter for Admin requests that sets Retry-After when it blocks. */
const requestBlock = (
  name: string,
  block: SpamBlock,
  errorOptions: ConstructorParameters<typeof errors.TooManyRequestsError>[0],
) =>
  limiter(name, block, {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      res.set(
        'Retry-After',
        String(Math.max(1, Math.ceil((nextValidRequestDate.getTime() - Date.now()) / 1000))),
      );

      return next(new errors.TooManyRequestsError({ ...errorOptions }));
    },
  });

const upgradeBlock = () =>
  requestBlock('upgrade_requests', 'upgrade_block', {
    message: messages.upgradeBlock,
    context: 'The staff user budget for update POST attempts has been exhausted.',
    help: 'Wait for Retry-After before retrying. Reuse the original idempotency_key for the same update.',
  });

const upgradeApiBlock = () =>
  requestBlock('upgrade_api', 'upgrade_api_block', {
    message: messages.upgradeBlock,
    context: 'The shared IP budget for update API requests has been exhausted.',
    help: 'Wait for Retry-After before retrying. Reuse the original idempotency_key for the same update.',
  });

const staffInviteBlock = () =>
  requestBlock('staff_invites', 'staff_invite_block', {
    message: messages.staffInviteBlock,
    code: 'STAFF_INVITE_RATE_LIMIT',
  });

// This locks a single endpoint based on excessive requests from an IP.
// Currently only used for auth type methods.
// We allow for a generous number of requests here to prevent communites on the same IP bing barred on account of a single user
// Defaults to 50 attempts per hour and locks the endpoint for an hour
const globalBlock = () =>
  limiter('globalBlock', 'global_block', {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      const { attempts, period } = quotedLimits('global_block');

      return next(
        new errors.TooManyRequestsError({
          message: `Too many attempts try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.forgottenPasswordIp.error, { rfa: attempts, rfp: period }),
          help: tpl(messages.tooManyAttempts),
        }),
      );
    },
  });

const globalReset = () =>
  limiter('globalReset', 'global_reset', {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      const { attempts, period } = quotedLimits('global_reset');

      return next(
        new errors.TooManyRequestsError({
          message: `Too many attempts try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.forgottenPasswordIp.error, { rfa: attempts, rfp: period }),
          help: tpl(messages.forgottenPasswordIp.context),
        }),
      );
    },
  });

const webmentionsBlock = () =>
  limiter('webmentionsBlock', 'webmentions_block', {
    attachResetToRequest: false,
    failCallback(req, res, next) {
      return next(new errors.TooManyRequestsError({ message: messages.webmentionsBlock }));
    },
  });

const emailPreviewBlock = () =>
  limiter('emailPreviewBlock', 'email_preview_block', {
    attachResetToRequest: false,
    failCallback(req, res, next) {
      return next(new errors.TooManyRequestsError({ message: messages.emailPreviewBlock }));
    },
  });

const membersAuth = () =>
  limiter('membersAuth', 'user_login', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many sign-in attempts try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManySigninAttempts.context),
          help: tpl(messages.tooManySigninAttempts.context),
        }),
      );
    },
  });

/**
 * This one should have higher limits because it checks across all email addresses
 */
const membersAuthEnumeration = () =>
  limiter('membersAuthEnumeration', 'member_login', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many different sign-in attempts, try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManySigninAttempts.context),
          help: tpl(messages.tooManySigninAttempts.context),
        }),
      );
    },
  });

const checkoutSessionGlobal = () =>
  limiter('checkoutSessionGlobal', 'checkout_session_global', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many checkout attempts, try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManyCheckoutAttempts.context),
          help: tpl(messages.tooManyCheckoutAttempts.context),
        }),
      );
    },
  });

const checkoutSessionEmail = () =>
  limiter('checkoutSessionEmail', 'checkout_session_email', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many checkout attempts for this email, try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManyCheckoutAttempts.context),
          help: tpl(messages.tooManyCheckoutAttempts.context),
        }),
      );
    },
  });

const otcVerificationEnumeration = () =>
  limiter('otcVerificationEnumeration', 'otc_verification_enumeration', {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many verification attempts across multiple codes, try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManyOTCVerificationAttempts.context),
          help: tpl(messages.tooManyOTCVerificationAttempts.context),
          code: 'OTC_TOTAL_ATTEMPTS_RATE_LIMITED',
        }),
      );
    },
  });

const otcVerification = () =>
  limiter('otcVerification', 'otc_verification', {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many attempts for this verification code, try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.tooManyOTCVerificationAttempts.context),
          help: tpl(messages.tooManyOTCVerificationAttempts.context),
          code: 'OTC_CODE_ATTEMPTS_RATE_LIMITED',
        }),
      );
    },
  });

// Stops login attempts for a user+IP pair with an increasing time period starting from 10 minutes
// and rising to a week in a fibonnaci sequence
// The user+IP count is reset when on successful login
// Default value of 5 attempts per user+IP pair
const userLogin = () =>
  limiter('userLogin', 'user_login', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      return next(
        new errors.TooManyRequestsError({
          message: `Too many login attempts. Please wait ${moment(nextValidRequestDate).fromNow(true)} before trying again, or reset your password.`,
          context: tpl(messages.tooManySigninAttempts.context),
          help: tpl(messages.tooManySigninAttempts.context),
        }),
      );
    },
  });

// Stop password reset requests when there are (freeRetries + 1) requests per lifetime per email
// Defaults here are 5 attempts per hour for a user+IP pair
// The endpoint is then locked for an hour
const userReset = () =>
  limiter('userReset', 'user_reset', {
    attachResetToRequest: true,
    failCallback(req, res, next, nextValidRequestDate) {
      const { attempts, period } = quotedLimits('user_reset');

      return next(
        new errors.TooManyRequestsError({
          message: `Too many password reset attempts try again in ${moment(nextValidRequestDate).fromNow(true)}`,
          context: tpl(messages.forgottenPasswordEmail.error, { rfa: attempts, rfp: period }),
          help: tpl(messages.forgottenPasswordEmail.context),
        }),
      );
    },
  });

const userVerification = () =>
  limiter('userVerification', 'user_verification', {
    attachResetToRequest: true,
    failCallback(req, res, next) {
      return next(new errors.TooManyRequestsError({ message: tpl(messages.tooManyAttempts) }));
    },
  });

const sendVerificationCode = () =>
  limiter('sendVerificationCode', 'send_verification_code', {
    attachResetToRequest: true,
    failCallback(req, res, next) {
      return next(new errors.TooManyRequestsError({ message: tpl(messages.tooManyAttempts) }));
    },
  });

// This protects a private blog from spam attacks. The defaults here allow 10 attempts per IP per hour
// The endpoint is then locked for an hour
const privateBlog = () =>
  limiter('privateBlog', 'private_block', {
    attachResetToRequest: false,
    failCallback(req, res, next, nextValidRequestDate) {
      const { attempts, period } = quotedLimits('private_block');

      logging.error(
        new errors.TooManyRequestsError({
          message: tpl(messages.tooManySigninAttempts.error, {
            rateSigninAttempts: attempts,
            rateSigninPeriod: period,
          }),
          context: tpl(messages.tooManySigninAttempts.context),
        }),
      );

      return next(
        new errors.TooManyRequestsError({
          message: `Too many private sign-in attempts try again in ${moment(nextValidRequestDate).fromNow(true)}`,
        }),
      );
    },
  });

const contentApiKey = () =>
  limiter(
    'contentApiKey',
    'content_api_key',
    {
      attachResetToRequest: true,
      failCallback(req, res, next) {
        const err = new errors.TooManyRequestsError({
          message: tpl(messages.tooManyAttempts),
        });

        logging.error(err);
        return next(err);
      },
    },
    { memory: true },
  );

/** Drop every limiter and store, so the next call rebuilds from current config. For tests. */
const reset = () => {
  instances.clear();
  databaseFactory = undefined;
  clearInterval(cleanupTimer);
  cleanupTimer = undefined;
};

const spamPrevention = {
  upgradeBlock,
  upgradeApiBlock,
  staffInviteBlock,
  globalBlock,
  globalReset,
  userLogin,
  sendVerificationCode,
  userVerification,
  membersAuth,
  membersAuthEnumeration,
  checkoutSessionGlobal,
  checkoutSessionEmail,
  otcVerification,
  otcVerificationEnumeration,
  userReset,
  privateBlog,
  contentApiKey,
  webmentionsBlock,
  emailPreviewBlock,
  clearExpired,
  reset,
};

export type SpamPrevention = typeof spamPrevention;

// a plain object, not ES exports, so tests can stub each limiter
module.exports = spamPrevention;
