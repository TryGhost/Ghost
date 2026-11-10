import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import moment from 'moment';
import { RateLimiterMemory, RateLimiterMySQL, RateLimiterSQLite } from 'rate-limiter-flexible';
import config from '../../../../../shared/config';
import type { SpamBlock } from '../../../../../shared/config/schema/spam';
import type { Request } from 'express';
import { BackoffLimiter } from './backoff-limiter';
import type { BackoffOptions, LimiterFactory } from './backoff-limiter';

const messages = {
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
  memberEmailUpdateBlock: 'Too many email change requests. Try again in an hour.',
};

const TABLE = 'rate_limits';
const CLEANUP_INTERVAL = 60 * 60 * 1000;
const CLEANUP_BATCH = 500;

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

/** How long a block lasts, as "10 minutes". */
const waitText = (ms: number) => moment.duration(ms).humanize();

const memoryFactory: LimiterFactory = (options) => new RateLimiterMemory(options);

// required late, as before: loading db builds the knex instance
const getDb = (): typeof import('../../../../data/db') => require('../../../../data/db');

/**
 * Deletes expired rows from every limiter. Runs hourly once a database limiter exists.
 *
 * Reads the keys first, then deletes by primary key, so it locks rows in the
 * same order as a limiter's upsert. A DELETE ranging over the expire index
 * deadlocks with an upsert resetting the same expired row.
 */
const clearExpired = async () => {
  const { knex } = getDb();

  for (;;) {
    const now = Date.now();
    const keys: string[] = await knex(TABLE)
      .where('expire', '<', now)
      .limit(CLEANUP_BATCH)
      .pluck('key');

    if (keys.length === 0) {
      return;
    }

    // MySQL may still pick the expire index for a short key list; the hint is a comment to SQLite
    await knex.raw(
      `DELETE /*+ NO_INDEX(${TABLE} ${TABLE}_expire_index) */ FROM ?? WHERE ?? IN (${keys.map(() => '?').join(', ')}) AND ?? < ?`,
      [TABLE, 'key', ...keys, 'expire', now],
    );

    if (keys.length < CLEANUP_BATCH) {
      return;
    }
  }
};

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

type LimiterOptions = Pick<BackoffOptions, 'key' | 'ignoreIP' | 'onBlocked'>;

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

const bodyField = (req: Request, field: string): string | undefined =>
  req.body?.[field] || undefined;

/** Trims and lowercases an email, so case and spacing can't open a fresh bucket. */
const emailKey = (email: unknown): string | undefined =>
  email ? String(email).trim().toLowerCase() : undefined;

/**
 * The id of the member a verified identity token names, as set by the members
 * `loadIdentityTokenMember` middleware, or undefined. Not the email, which the
 * member can change to get a fresh budget.
 */
const memberIdentityKey = (req: Request): string | undefined =>
  (req as Request & { identityTokenMemberId?: string | null }).identityTokenMemberId || undefined;

/** A limiter for Admin requests that sets Retry-After when it blocks. */
const requestBlock = (
  name: string,
  block: SpamBlock,
  errorOptions: ConstructorParameters<typeof errors.TooManyRequestsError>[0],
  keyOptions: Pick<LimiterOptions, 'key' | 'ignoreIP'> = {},
) =>
  limiter(name, block, {
    ...keyOptions,
    onBlocked(retryAfterMs, res) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));

      return new errors.TooManyRequestsError({ ...errorOptions });
    },
  });

// A staff user has one budget across IP addresses and Ghost instances.
// Denied users cannot consume the owner or administrator budget.
const upgradeBlock = () =>
  requestBlock(
    'upgrade_requests',
    'upgrade_block',
    {
      message: messages.upgradeBlock,
      context: 'The staff user budget for update POST attempts has been exhausted.',
      help: 'Wait for Retry-After before retrying. Reuse the original idempotency_key for the same update.',
    },
    { ignoreIP: true, key: (req) => (req as Request & { user: { id: string } }).user.id },
  );

// Limits authentication work across all upgrade routes, before staff identity
// is available. This is separate from the stricter per-user POST budget.
const upgradeApiBlock = () =>
  requestBlock('upgrade_api', 'upgrade_api_block', {
    message: messages.upgradeBlock,
    context: 'The shared IP budget for update API requests has been exhausted.',
    help: 'Wait for Retry-After before retrying. Reuse the original idempotency_key for the same update.',
  });

// One budget for the whole site
const staffInviteBlock = () =>
  requestBlock(
    'staff_invites',
    'staff_invite_block',
    {
      message: messages.staffInviteBlock,
      code: 'STAFF_INVITE_RATE_LIMIT',
    },
    { ignoreIP: true },
  );

// Each request emails an address the member chooses, so a member has one
// budget across IP addresses and email changes
const memberEmailUpdateBlock = () =>
  requestBlock(
    'member_email_update',
    'member_email_update',
    {
      message: messages.memberEmailUpdateBlock,
    },
    { ignoreIP: true, key: memberIdentityKey },
  );

// This locks a single endpoint based on excessive requests from an IP.
// Currently only used for auth type methods.
// We allow for a generous number of requests here to prevent communites on the same IP bing barred on account of a single user
// Defaults to 50 attempts per hour and locks the endpoint for an hour
const globalBlock = () =>
  limiter('globalBlock', 'global_block', {
    key: (req) => req.path,
    onBlocked(retryAfterMs) {
      const { attempts, period } = quotedLimits('global_block');

      return new errors.TooManyRequestsError({
        message: `Too many attempts try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.forgottenPasswordIp.error, { rfa: attempts, rfp: period }),
        help: tpl(messages.tooManyAttempts),
      });
    },
  });

const globalReset = () =>
  limiter('globalReset', 'global_reset', {
    key: (req) => req.path,
    onBlocked(retryAfterMs) {
      const { attempts, period } = quotedLimits('global_reset');

      return new errors.TooManyRequestsError({
        message: `Too many attempts try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.forgottenPasswordIp.error, { rfa: attempts, rfp: period }),
        help: tpl(messages.forgottenPasswordIp.context),
      });
    },
  });

const webmentionsBlock = () =>
  limiter('webmentionsBlock', 'webmentions_block', {
    onBlocked: () => new errors.TooManyRequestsError({ message: messages.webmentionsBlock }),
  });

// One budget for the whole site
const emailPreviewBlock = () =>
  limiter('emailPreviewBlock', 'email_preview_block', {
    ignoreIP: true,
    onBlocked: () => new errors.TooManyRequestsError({ message: messages.emailPreviewBlock }),
  });

/**
 * Block too many sign-in requests for the same email address
 */
const membersAuth = () =>
  limiter('membersAuth', 'user_login', {
    key: (req) => emailKey(bodyField(req, 'email')),
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many sign-in attempts try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManySigninAttempts.context),
        help: tpl(messages.tooManySigninAttempts.context),
      }),
  });

/**
 * This one should have higher limits because it checks across all email addresses
 */
const membersAuthEnumeration = () =>
  limiter('membersAuthEnumeration', 'member_login', {
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many different sign-in attempts, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManySigninAttempts.context),
        help: tpl(messages.tooManySigninAttempts.context),
      }),
  });

const checkoutSessionGlobal = () =>
  limiter('checkoutSessionGlobal', 'checkout_session_global', {
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many checkout attempts, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManyCheckoutAttempts.context),
        help: tpl(messages.tooManyCheckoutAttempts.context),
      }),
  });

const checkoutSessionEmail = () =>
  limiter('checkoutSessionEmail', 'checkout_session_email', {
    // ignoring IP blocks rotating-IP attacks against a single email address
    ignoreIP: true,
    key: (req) => emailKey(req.body.customerEmail),
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many checkout attempts for this email, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManyCheckoutAttempts.context),
        help: tpl(messages.tooManyCheckoutAttempts.context),
      }),
  });

/**
 * Block too many OTC verification attempts from same IP (blocks user enumeration)
 */
const otcVerificationEnumeration = () =>
  limiter('otcVerificationEnumeration', 'otc_verification_enumeration', {
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many verification attempts across multiple codes, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManyOTCVerificationAttempts.context),
        help: tpl(messages.tooManyOTCVerificationAttempts.context),
        code: 'OTC_TOTAL_ATTEMPTS_RATE_LIMITED',
      }),
  });

/**
 * Block too many attempts for the same otcRef
 */
const otcVerification = () =>
  limiter('otcVerification', 'otc_verification', {
    // ignoring IP blocks rotating-IP attacks; only one IP should receive an otcRef
    ignoreIP: true,
    key: (req) => bodyField(req, 'otcRef'),
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many attempts for this verification code, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManyOTCVerificationAttempts.context),
        help: tpl(messages.tooManyOTCVerificationAttempts.context),
        code: 'OTC_CODE_ATTEMPTS_RATE_LIMITED',
      }),
  });

// Stops login attempts for an IP with an increasing time period starting from 10 minutes
// and rising to a week in a fibonnaci sequence
// The IP's count is reset on successful login
// Default value of 5 attempts per IP
const userLogin = () =>
  limiter('userLogin', 'user_login', {
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many login attempts. Please wait ${waitText(retryAfterMs)} before trying again, or reset your password.`,
        context: tpl(messages.tooManySigninAttempts.context),
        help: tpl(messages.tooManySigninAttempts.context),
      }),
  });

// Stops password reset requests when there are (freeRetries + 1) requests per lifetime per IP
// Defaults here are 5 attempts per hour per IP
// The endpoint is then locked for an hour
const userReset = () =>
  limiter('userReset', 'user_reset', {
    onBlocked(retryAfterMs) {
      const { attempts, period } = quotedLimits('user_reset');

      return new errors.TooManyRequestsError({
        message: `Too many password reset attempts try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.forgottenPasswordIp.error, { rfa: attempts, rfp: period }),
        help: tpl(messages.forgottenPasswordIp.context),
      });
    },
  });

const userVerification = () =>
  limiter('userVerification', 'user_verification', {
    onBlocked: () => new errors.TooManyRequestsError({ message: tpl(messages.tooManyAttempts) }),
  });

const userVerificationChallenge = () =>
  limiter('userVerificationChallenge', 'user_verification_challenge', {
    ignoreIP: true,
    onBlocked: () =>
      new errors.TooManyRequestsError({
        message: 'Too many verification attempts. Please request a new code.',
        code: 'STAFF_VERIFICATION_ATTEMPTS_RATE_LIMITED',
      }),
  });

const sendVerificationCode = () =>
  limiter('sendVerificationCode', 'send_verification_code', {
    onBlocked: () => new errors.TooManyRequestsError({ message: tpl(messages.tooManyAttempts) }),
  });

// One verification-email budget per user, independent of IP or session.
const verificationEmail = () =>
  limiter('verificationEmail', 'send_verification_code_user', {
    ignoreIP: true,
    onBlocked: (retryAfterMs) =>
      new errors.TooManyRequestsError({
        message: `Too many verification emails requested, try again in ${waitText(retryAfterMs)}`,
        context: tpl(messages.tooManyAttempts),
      }),
  });

// This protects a private blog from spam attacks. The defaults here allow 10 attempts per IP per hour
// The endpoint is then locked for an hour
const privateBlog = () =>
  limiter('privateBlog', 'private_block', {
    onBlocked(retryAfterMs) {
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

      return new errors.TooManyRequestsError({
        message: `Too many private sign-in attempts try again in ${waitText(retryAfterMs)}`,
      });
    },
  });

// Counts Content API requests per IP; a successful request resets the count
const contentApiKey = () =>
  limiter(
    'contentApiKey',
    'content_api_key',
    {
      onBlocked() {
        const err = new errors.TooManyRequestsError({
          message: tpl(messages.tooManyAttempts),
        });

        logging.error(err);
        return err;
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
  emailKey,
  memberIdentityKey,
  upgradeBlock,
  upgradeApiBlock,
  staffInviteBlock,
  memberEmailUpdateBlock,
  globalBlock,
  globalReset,
  userLogin,
  sendVerificationCode,
  verificationEmail,
  userVerification,
  userVerificationChallenge,
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
