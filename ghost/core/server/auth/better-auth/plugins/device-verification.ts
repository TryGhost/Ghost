import crypto from 'node:crypto';
import {
  defineRequestState,
  getCurrentAdapter,
  runWithTransaction,
} from '@better-auth/core/context';
import { APIError, BASE_ERROR_CODES } from '@better-auth/core/error';
import type { BetterAuthPlugin, GenericEndpointContext, Session, User } from 'better-auth';
import {
  createAuthEndpoint,
  createAuthMiddleware,
  isAPIError,
  sessionMiddleware,
} from 'better-auth/api';
import { parseCookies } from 'better-auth/cookies';
import { z } from 'zod';
import type { SignInCodeMessage } from '../../emails/sign-in-code';
import type { Limiter } from '../rate-limit';
import { DEVICE_VERIFICATION_PREFIX, ROUTES, SSO_PREFIX } from '../routes';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const IDENTIFIER_PREFIX = 'device-verification:';

/** `advanced.cookies` key of the device-trust cookie, named `ghost-admin-device` by createAuth */
export const DEVICE_TRUST_COOKIE = 'device_trust';

// Ghost's legacy codes, which defineErrorCodes can't hold (they start with a digit)
export const DEVICE_VERIFICATION_ERROR_CODES = {
  TOKEN_REQUIRED: { code: '2FA_TOKEN_REQUIRED', message: 'User must verify session to login.' },
  NEW_DEVICE_DETECTED: {
    code: '2FA_NEW_DEVICE_DETECTED',
    message: 'User must verify session to login.',
  },
  INVALID_CODE: { code: 'INVALID_CODE', message: 'Invalid verification code.' },
  TOO_MANY_ATTEMPTS: {
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many verification attempts. Please request a new code.',
  },
  TOO_MANY_EMAILS: {
    code: 'TOO_MANY_VERIFICATION_EMAILS',
    message: 'Too many verification emails requested, try again later.',
  },
  EMAIL_FAILED: {
    code: 'EMAIL_FAILED',
    message: 'Failed to send email. Please check your site configuration and try again.',
  },
} as const;

const ERRORS = DEVICE_VERIFICATION_ERROR_CODES;

/** Paths an unverified session can still use; ghostSessionGate makes it anonymous elsewhere */
export const allowsUnverifiedSession = (path: string | undefined) =>
  !!path && (path.startsWith(DEVICE_VERIFICATION_PREFIX) || path === ROUTES.signOut);

// Sign-in methods that are a stronger factor than an email code
const PASSWORDLESS_SIGN_IN: string[] = [ROUTES.magicLinkVerify, ROUTES.passkeyVerifyAuthentication];
const isPasswordlessSignIn = (path: string | undefined) =>
  !!path && (PASSWORDLESS_SIGN_IN.includes(path) || path.startsWith(SSO_PREFIX));

/** What `sendCode` emails: the shared staff sign-in code email */
export type DeviceVerificationCode = SignInCodeMessage;

export type DeviceVerificationOptions = {
  /** `security:staffDeviceVerification`, read per request */
  isEnabled(): boolean;
  /** The `require_email_mfa` setting */
  isEmailMfaRequired(): boolean;
  /** One email budget per user, whatever the IP or session */
  emailLimiter(): Limiter;
  sendCode(message: DeviceVerificationCode): Promise<void>;
};

type VerificationRow = {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  attempts: number;
};

type SessionRow = Session & { verified?: boolean | null };

// What the gate saw of the request's unverified session, for sign-in to use
const previousSession = defineRequestState<{
  id: string;
  userId: string;
  code?: string;
  /** Set once the inline code verified the new session */
  verifiedInline?: boolean;
} | null>(() => null);

const hmac = (secret: string, value: string) =>
  crypto.createHmac('sha256', secret).update(value).digest('base64url');

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const identifierFor = (sessionId: string) => `${IDENTIFIER_PREFIX}${sessionId}`;
const hashCode = (secret: string, sessionId: string, code: string) =>
  hmac(secret, `${identifierFor(sessionId)}:${code}`);

// `<userId>.<expiry, epoch seconds>.<signature>`; the expiry is signed so a saved cookie can't outlive it
const trustValue = (secret: string, userId: string, expiresAt: number) =>
  `${userId}.${expiresAt}.${hmac(secret, `ghost-admin-device:${userId}:${expiresAt}`)}`;

type Ctx = Pick<GenericEndpointContext, 'context' | 'headers'>;

const requestCookies = (ctx: Ctx) => parseCookies(ctx.headers?.get('cookie') ?? '');

function hasDeviceTrust(ctx: Ctx, userId: string): boolean {
  const { name } = ctx.context.createAuthCookie(DEVICE_TRUST_COOKIE);
  const value = requestCookies(ctx).get(name);
  const expiresAt = Number(value?.split('.')[1]);
  if (!value || !Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= Date.now()) {
    return false;
  }
  return safeEqual(value, trustValue(ctx.context.secret, userId, expiresAt));
}

export type CodeResult = 'verified' | 'invalid' | 'exhausted';

/**
 * Checks a code against the session's stored one. Every attempt counts before
 * the comparison, guarded by `attempts < 5`, so concurrent wrong codes can't
 * pass the limit; a match consumes the code. An exhausted code stays, refusing
 * every try, until a new code replaces it or it expires, as legacy caps a
 * challenge until it is resent.
 */
export async function verifyCode(ctx: Ctx, sessionId: string, code: string): Promise<CodeResult> {
  const adapter = await getCurrentAdapter(ctx.context.adapter);
  const byIdentifier = [{ field: 'identifier', value: identifierFor(sessionId) }];
  const row = await adapter.findOne<VerificationRow>({
    model: 'verification',
    where: byIdentifier,
  });
  if (!row) {
    return 'invalid';
  }
  const byId = [{ field: 'id', value: row.id }];
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    await adapter.delete({ model: 'verification', where: byId });
    return 'invalid';
  }

  const counted = await adapter.incrementOne<VerificationRow>({
    model: 'verification',
    where: [...byId, { field: 'attempts', operator: 'lt', value: MAX_ATTEMPTS }],
    increment: { attempts: 1 },
  });
  if (!counted) {
    return 'exhausted';
  }

  if (!safeEqual(hashCode(ctx.context.secret, sessionId, code), row.value)) {
    return 'invalid';
  }
  const consumed = await adapter.consumeOne({ model: 'verification', where: byId });
  return consumed ? 'verified' : 'invalid';
}

/**
 * Whether a new session starts verified (plan §3.3). createAuth's
 * `session.create.before` hook calls it once its own rules haven't verified
 * the session. A valid inline code is checked last, since it consumes the code.
 */
export async function verifiesNewSession(
  session: { userId: string },
  ctx: GenericEndpointContext,
  { isEmailMfaRequired }: Pick<DeviceVerificationOptions, 'isEmailMfaRequired'>,
): Promise<boolean> {
  if (isPasswordlessSignIn(ctx.path)) {
    return true;
  }

  const adapter = await getCurrentAdapter(ctx.context.adapter);
  const user = await adapter.findOne<User & { last_seen?: Date | null }>({
    model: 'user',
    where: [{ field: 'id', value: session.userId }],
  });
  // First login, even with require_email_mfa on, as legacy sign-in does
  if (user && !user.last_seen) {
    return true;
  }

  if (!isEmailMfaRequired() && hasDeviceTrust(ctx, session.userId)) {
    return true;
  }

  const previous = await previousSession.get();
  if (previous?.code && previous.userId === session.userId) {
    const result = await verifyCode(ctx, previous.id, previous.code);
    // Refuses sign-in rather than sending a new code, which would reset the cap
    if (result === 'exhausted') {
      throw APIError.from('TOO_MANY_REQUESTS', ERRORS.TOO_MANY_ATTEMPTS);
    }
    if (result === 'verified') {
      await previousSession.set({ ...previous, verifiedInline: true });
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Called by ghostSessionGate for an unverified session it makes anonymous, so
 * a sign-in can replace it and verify an inline `token` against its code.
 */
export async function recordUnverifiedSession(
  ctx: Pick<GenericEndpointContext, 'path' | 'body'>,
  session: { id: string; userId: string },
): Promise<void> {
  const code: unknown = ctx.path === ROUTES.signInEmail ? ctx.body?.token : undefined;
  await previousSession.set({
    id: session.id,
    userId: session.userId,
    code: typeof code === 'string' ? code : undefined,
  });
}

/** Ghost's email-code device verification on top of Better Auth (plan §3.3). */
export const ghostDeviceVerification = (options: DeviceVerificationOptions) => {
  async function issueCode(
    ctx: GenericEndpointContext,
    session: SessionRow,
    user: Pick<User, 'id' | 'email'>,
  ): Promise<void> {
    const revoked = () => APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.SESSION_EXPIRED);
    const bySession = [{ field: 'id', value: session.id }];

    // Only a live session spends the user's email budget. The limiter takes its
    // own pool connection, so it runs before the transaction, never inside it
    const live = await (
      await getCurrentAdapter(ctx.context.adapter)
    ).findOne({ model: 'session', where: bySession });
    if (!live) {
      throw revoked();
    }
    const limit = await options.emailLimiter().consume({ key: user.id });
    if (!limit.allowed) {
      throw APIError.from('TOO_MANY_REQUESTS', ERRORS.TOO_MANY_EMAILS);
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await runWithTransaction(ctx.context.adapter, async () => {
      const adapter = await getCurrentAdapter(ctx.context.adapter);
      // Locks the session row, so concurrent sends leave one live code. The
      // cutoff: a session gone by this lock (a suspension, sign-out or
      // replacing sign-in) gets no code; one revoked after the commit still
      // gets an email whose code can't verify a deleted session
      const locked = await adapter.update({
        model: 'session',
        where: bySession,
        update: { updatedAt: new Date() },
      });
      if (!locked) {
        throw revoked();
      }
      await adapter.deleteMany({
        model: 'verification',
        where: [{ field: 'identifier', value: identifierFor(session.id) }],
      });
      await adapter.create({
        model: 'verification',
        data: {
          identifier: identifierFor(session.id),
          value: hashCode(ctx.context.secret, session.id, code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          attempts: 0,
        },
      });
    });

    try {
      await options.sendCode({
        email: user.email,
        code,
        userAgent: session.userAgent ?? null,
        ipAddress: session.ipAddress ?? null,
        isEmailMfaRequired: options.isEmailMfaRequired(),
      });
    } catch (err) {
      ctx.context.logger.error('Sending the device verification code failed', err);
      throw APIError.from('INTERNAL_SERVER_ERROR', ERRORS.EMAIL_FAILED);
    }
  }

  // A verified code restores the user's email budget, as legacy does
  async function resetEmailLimit(ctx: GenericEndpointContext, userId: string) {
    await options
      .emailLimiter()
      .reset({ key: userId })
      .catch((err: unknown) =>
        ctx.context.logger.error('Resetting the verification email limit failed', err),
      );
  }

  async function setDeviceTrust(ctx: GenericEndpointContext, userId: string) {
    if (options.isEmailMfaRequired()) {
      return;
    }
    const cookie = ctx.context.createAuthCookie(DEVICE_TRUST_COOKIE);
    const maxAge = ctx.context.sessionConfig.expiresIn;
    const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
    ctx.setCookie(cookie.name, trustValue(ctx.context.secret, userId, expiresAt), {
      ...cookie.attributes,
      maxAge,
    });
  }

  function clearDeviceTrust(ctx: GenericEndpointContext) {
    const cookie = ctx.context.createAuthCookie(DEVICE_TRUST_COOKIE);
    ctx.setCookie(cookie.name, '', { ...cookie.attributes, maxAge: 0 });
  }

  const codeError = (result: CodeResult) =>
    result === 'exhausted'
      ? APIError.from('TOO_MANY_REQUESTS', ERRORS.TOO_MANY_ATTEMPTS)
      : APIError.from('UNAUTHORIZED', ERRORS.INVALID_CODE);

  return {
    id: 'ghost-device-verification',
    schema: {
      verification: {
        fields: {
          attempts: { type: 'number', required: false, defaultValue: 0, input: false },
        },
      },
    },

    hooks: {
      after: [
        {
          matcher: () => true,
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.path === ROUTES.signOut) {
              if (options.isEmailMfaRequired()) {
                clearDeviceTrust(ctx);
              }
              return;
            }

            const created = ctx.context.newSession;
            if (!created || isAPIError(ctx.context.returned) || !options.isEnabled()) {
              return;
            }

            // Sign-in replaces the request's unverified session, as legacy regenerates it
            const previous = await previousSession.get();
            if (previous && previous.id !== created.session.id) {
              const adapter = await getCurrentAdapter(ctx.context.adapter);
              await adapter.deleteMany({
                model: 'verification',
                where: [{ field: 'identifier', value: identifierFor(previous.id) }],
              });
              await adapter.delete({
                model: 'session',
                where: [{ field: 'id', value: previous.id }],
              });
            }

            const session = created.session as SessionRow;
            if (session.verified === true) {
              if (previous?.verifiedInline) {
                await resetEmailLimit(ctx, session.userId);
              }
              await setDeviceTrust(ctx, session.userId);
              return;
            }

            await issueCode(ctx, session, created.user);
            throw APIError.from(
              'FORBIDDEN',
              options.isEmailMfaRequired() ? ERRORS.TOKEN_REQUIRED : ERRORS.NEW_DEVICE_DETECTED,
            );
          }),
        },
      ],
    },

    endpoints: {
      /** Emails a new code for the current session (legacy `POST /session/verify`) */
      sendDeviceVerification: createAuthEndpoint(
        ROUTES.deviceVerificationSend,
        { method: 'POST', use: [sessionMiddleware] },
        async (ctx) => {
          const { session, user } = ctx.context.session;
          await issueCode(ctx, session as SessionRow, user);
          return ctx.json({ status: true });
        },
      ),

      /** Verifies the current session with its code (legacy `PUT /session/verify`) */
      verifyDevice: createAuthEndpoint(
        ROUTES.deviceVerificationVerify,
        { method: 'POST', body: z.object({ code: z.string() }), use: [sessionMiddleware] },
        async (ctx) => {
          const { session } = ctx.context.session;
          const result = await verifyCode(ctx, session.id, ctx.body.code);
          if (result !== 'verified') {
            throw codeError(result);
          }

          await resetEmailLimit(ctx, session.userId);
          // The cutoff: a session gone by this update gets no verification or
          // device trust, which is set with no await in between
          const updated = await ctx.context.internalAdapter.updateSession(session.token, {
            verified: true,
          });
          if (!updated) {
            throw APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.SESSION_EXPIRED);
          }
          await setDeviceTrust(ctx, session.userId);
          return ctx.json({ status: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
