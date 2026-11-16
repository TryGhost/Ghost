import type { Request, Response } from 'express';
import * as errors from '@tryghost/errors';
import crypto from 'node:crypto';
import type urlUtilsInstance from '../../../shared/url-utils';
import * as totp from '../totp';

const { BadRequestError } = errors;
const emailTemplate = require('./emails/signin');
// ua-parser-js ships no types; got is ESM-only
const UAParser = require('ua-parser-js');
const got = require('got').default;
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
const AUTH_CODE_VALIDITY_MS = 5 * 60 * 1000;
const AUTH_CODE_CHALLENGE_BYTES = 16;

export interface User {
  id: string;
  get(attr: string): string;
}

// Only the id is read when assigning a user to a session
type SessionUser = Pick<User, 'id'>;

export interface Session {
  regenerate(cb: (err?: unknown) => void): void;
  user_id?: string;
  origin?: string;
  user_agent?: string;
  ip?: string;
  verified?: boolean;
  verified_user_id?: string;
  auth_code_challenge?: string;
  auth_code_generated_at?: number;
}

export type Req = Request & { session: Session };
type Res = Response;

export interface SessionServiceDeps {
  getSession: (req: Req, res: Res) => Promise<Session>;
  findUserById: (data: { id: string }) => Promise<User>;
  getOriginOfRequest: (req: Req) => string | null;
  getSettingsCache: ((key: 'require_email_mfa') => boolean) &
    ((key: 'admin_session_secret' | 'title') => string);
  getBlogLogo: () => string;
  mailer: { send(message: { to: string; subject: string; html: string }): Promise<unknown> };
  t: (key: string, options?: Record<string, unknown>) => string;
  urlUtils: typeof urlUtilsInstance;
  isStaffDeviceVerificationDisabled: () => boolean;
  limitVerificationEmailForUser: (userId: string) => Promise<void>;
  resetVerificationEmailForUser: (userId: string) => Promise<unknown>;
  consumeAuthCodeAttempt: (challenge: string) => Promise<void>;
}

type SessionOptions = {
  session: Session;
  user: SessionUser;
  origin: string | null;
  userAgent?: string;
  ip?: string;
};

export interface SessionService {
  getUserForSession(req: Req, res: Res): Promise<User | null>;
  createSessionForUser(req: Req, res: Res, user: SessionUser): Promise<void>;
  createVerifiedSessionForUser(req: Req, res: Res, user: SessionUser): Promise<void>;
  assignVerifiedUserToSession(options: SessionOptions): Promise<void>;
  rotateAndAssignVerifiedUserToSession(options: {
    req: Req;
    user: SessionUser;
    ip?: string;
  }): Promise<void>;
  removeUserForSession(req: Req, res: Res): Promise<void>;
  verifySession(req: Req, res: Res): Promise<void>;
  isVerifiedSession(req: Req, res: Res): Promise<boolean>;
  sendAuthCodeToUser(req: Req, res: Res): Promise<void>;
  verifyAuthCodeForUser(req: Req, res: Res): Promise<boolean>;
  generateAuthCodeForUser(req: Req, res: Res): Promise<string>;
  isVerificationRequired(): boolean;
}

export default function createSessionService({
  getSession,
  findUserById,
  getOriginOfRequest,
  getSettingsCache,
  getBlogLogo,
  mailer,
  urlUtils,
  isStaffDeviceVerificationDisabled,
  limitVerificationEmailForUser,
  resetVerificationEmailForUser,
  consumeAuthCodeAttempt,
  t,
}: SessionServiceDeps): SessionService {
  // Await the reset so the next sign-in starts with a fresh email budget.
  // Store failures must not prevent a successfully verified user from signing in.
  async function clearVerificationEmailLimit(userId: string) {
    try {
      await resetVerificationEmailForUser(userId);
    } catch (err) {
      // best-effort. Don't block sign-in on a limiter reset failure
    }
  }
  function createAuthCodeChallenge() {
    return crypto.randomBytes(AUTH_CODE_CHALLENGE_BYTES).toString('hex');
  }

  function rotateAuthCodeChallenge(session: Session) {
    session.auth_code_challenge = createAuthCodeChallenge();
    session.auth_code_generated_at = Date.now();
  }

  function ensureAuthCodeChallenge(session: Session) {
    if (!session.auth_code_challenge) {
      rotateAuthCodeChallenge(session);
    }
    return session.auth_code_challenge;
  }

  function invalidateAuthCodeChallenge(session: Session) {
    session.auth_code_challenge = undefined;
    session.auth_code_generated_at = undefined;
  }

  function hasValidAuthCodeChallenge(
    session: Session,
  ): session is Session & { auth_code_challenge: string; auth_code_generated_at: number } {
    if (!session.auth_code_challenge || !session.auth_code_generated_at) {
      return false;
    }

    return Date.now() - session.auth_code_generated_at <= AUTH_CODE_VALIDITY_MS;
  }

  async function verifyAuthCode(session: Session, token: string | undefined, secret: string) {
    if (!token || !session.user_id || !hasValidAuthCodeChallenge(session)) {
      return false;
    }

    // The challenge survives session regeneration. Its shared, atomic budget also
    // covers concurrent requests and requests from different IP addresses.
    await consumeAuthCodeAttempt(session.auth_code_challenge);
    const verified = totp.verify(session.user_id, token, secret, session.auth_code_challenge);

    if (verified) {
      invalidateAuthCodeChallenge(session);
    }

    return verified;
  }

  // Reject any request whose origin isn't the admin site. This check is
  // used to prevent cross-origin logins (login CSRF).
  function assertRequestFromAdminOrigin(origin: string | null) {
    const adminOrigin = urlUtils.getAdminOrigin();

    if (origin !== adminOrigin) {
      throw new BadRequestError({
        message: `Request made from incorrect origin. Expected '${adminOrigin}' received '${origin}'.`,
      });
    }
  }

  function cookieCsrfProtection(req: Req, session: Session) {
    const origin = getOriginOfRequest(req);

    // Check that the origin matches the admin URL to prevent cross-origin
    // requests (e.g. no-cors form submissions from phishing sites)
    assertRequestFromAdminOrigin(origin);

    // If there is no origin on the session object it means this is a *new*
    // session, that hasn't been initialised yet. So we don't need CSRF protection
    if (!session.origin) {
      return;
    }

    if (session.origin !== origin) {
      throw new BadRequestError({
        message: `Request made from incorrect origin. Expected '${session.origin}' received '${origin}'.`,
      });
    }
  }

  /**
   * isVerificationRequired
   * Determines if 2FA verification is required based on site settings
   */
  function isVerificationRequired() {
    return getSettingsCache('require_email_mfa') === true;
  }

  async function assignUserToSession({
    session,
    user,
    origin,
    userAgent,
    ip,
    verificationToken,
  }: SessionOptions & { verificationToken?: string }) {
    if (!origin) {
      throw new BadRequestError({
        message:
          'Could not determine origin of request. Please ensure an Origin or Referrer header is present.',
      });
    }

    // A session may only ever be created for the admin panel's own origin, so a
    // cross-origin request (e.g. a login-CSRF form post) can't create a session.
    assertRequestFromAdminOrigin(origin);

    if (session.user_id && session.user_id !== user.id) {
      invalidateAuthCodeChallenge(session);
    }

    session.user_id = user.id;
    session.origin = origin;
    session.user_agent = userAgent;
    session.ip = ip;

    // If a verification token was provided with the login request, verify it
    if (verificationToken) {
      const secret = getSettingsCache('admin_session_secret');
      const isAuthCodeVerified = await verifyAuthCode(session, verificationToken, secret);

      if (isAuthCodeVerified) {
        session.verified = true;
        session.verified_user_id = user.id;
        invalidateAuthCodeChallenge(session);
        await clearVerificationEmailLimit(user.id);
      }
    }

    if (isStaffDeviceVerificationDisabled()) {
      session.verified = true;
      session.verified_user_id = user.id;
    }
  }

  async function createSessionForUser(req: Req, res: Res, user: SessionUser) {
    const previousSession = await getSession(req, res);

    // Carried over to the new session so verification state survives login
    const {
      user_id: previousUserId,
      verified: previousVerified,
      verified_user_id: previousVerifiedUserId,
      auth_code_challenge: previousAuthCodeChallenge,
      auth_code_generated_at: previousAuthCodeGeneratedAt,
    } = previousSession;

    // Ensure a new session is always created
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    const session = req.session;
    session.user_id = previousUserId;
    // Verification is bound to the user who completed it — any other user
    // (including sessions with no verified_user_id) must verify again
    const carryVerification = previousVerified === true && previousVerifiedUserId === user.id;
    session.verified = carryVerification ? true : undefined;
    session.verified_user_id = carryVerification ? previousVerifiedUserId : undefined;
    session.auth_code_challenge = previousAuthCodeChallenge;
    session.auth_code_generated_at = previousAuthCodeGeneratedAt;

    const origin = getOriginOfRequest(req);
    await assignUserToSession({
      session,
      user,
      origin,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      verificationToken: req.body && req.body.token,
    });
  }

  async function createVerifiedSessionForUser(req: Req, res: Res, user: SessionUser) {
    await createSessionForUser(req, res, user);
    await verifySession(req, res);
  }

  async function assignVerifiedUserToSession({
    session,
    user,
    origin,
    userAgent,
    ip,
  }: SessionOptions) {
    await assignUserToSession({
      session,
      user,
      origin,
      userAgent,
      ip,
    });

    session.verified = true;
    session.verified_user_id = user.id;
    invalidateAuthCodeChallenge(session);
  }

  /**
   * rotateAndAssignVerifiedUserToSession
   * Regenerates the Express session (issuing a new session_id) and then
   * assigns the verified user to the new session. Used after a password
   * change or reset so that any cloned or stolen copy of the pre-change
   * cookie is rejected on its next request.
   */
  async function rotateAndAssignVerifiedUserToSession({
    req,
    user,
    ip,
  }: {
    req: Req;
    user: SessionUser;
    ip?: string;
  }) {
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    await assignVerifiedUserToSession({
      session: req.session,
      user,
      origin: getOriginOfRequest(req),
      ip,
    });
  }

  async function generateAuthCodeForUser(req: Req, res: Res) {
    const session = await getSession(req, res);
    const secret = getSettingsCache('admin_session_secret');
    const challenge = ensureAuthCodeChallenge(session);
    return totp.generate(session.user_id as string, secret, challenge);
  }

  async function verifyAuthCodeForUser(req: Req, res: Res) {
    const session = await getSession(req, res);
    cookieCsrfProtection(req, session);

    const secret = getSettingsCache('admin_session_secret');
    const token = req.body && req.body.token;

    return verifyAuthCode(session, token, secret);
  }

  const formatTime = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format;

  /**
   * Get a readable location string from an IP address.
   */
  async function getGeolocationFromIP(ip: string | undefined) {
    if (!ip || (!IPV4_REGEX.test(ip) && !IPV6_REGEX.test(ip))) {
      return 'Unknown';
    }

    const gotOpts: { timeout: { request: number }; retry?: { limit: number } } = {
      timeout: {
        request: 500,
      },
    };

    if (process.env.NODE_ENV?.startsWith('test')) {
      gotOpts.retry = {
        limit: 0,
      };
    }

    const geojsUrl = `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`;

    try {
      const response: { city?: string; region?: string; country?: string } | undefined = await got(
        geojsUrl,
        gotOpts,
      ).json();

      const { city, region, country } = response || {};

      // Only include non-empty parts in the result
      const locationParts = [city, region, country].filter(Boolean);

      // If no valid parts, return 'Unknown'
      return locationParts.length > 0 ? locationParts.join(', ').trim() : 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  async function getDeviceDetails(userAgent: string | undefined, ip: string | undefined) {
    const parser = new UAParser();
    parser.setUA(userAgent);
    const result = parser.getResult();
    const deviceParts = [result.browser?.name || '', result.os?.name || ''].filter(Boolean);

    return {
      device: deviceParts.join(', '),
      location: await getGeolocationFromIP(ip),
      time: formatTime(new Date()),
    };
  }

  async function sendAuthCodeToUser(req: Req, res: Res) {
    const session = await getSession(req, res);
    cookieCsrfProtection(req, session);

    if (!session.user_id) {
      throw new BadRequestError({
        message: 'Could not fetch user from the session.',
      });
    }

    // Rate-limit verification emails per user (independent of IP/session) so a
    // caller with valid credentials can't flood a user's inbox by repeating
    // sign-in. Throws a TooManyRequestsError once the limit is exceeded.
    await limitVerificationEmailForUser(session.user_id);

    rotateAuthCodeChallenge(session);
    const token = await generateAuthCodeForUser(req, res);

    let user;
    try {
      user = await findUserById({ id: session.user_id });
    } catch (error) {
      // User session likely doesn't contain a valid user ID
      throw new BadRequestError({
        message: 'Could not fetch user from the session.',
      });
    }

    const recipient = user.get('email');
    const siteTitle = getSettingsCache('title');
    const siteLogo = getBlogLogo();
    const siteUrl = urlUtils.urlFor('home', true);
    const domain = urlUtils
      .urlFor('home', true)
      .match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    const siteDomain = domain && domain[1];
    const email = emailTemplate({
      t,
      siteTitle: siteTitle,
      email: recipient,
      siteDomain: siteDomain,
      siteUrl: siteUrl,
      siteLogo: siteLogo,
      token: token,
      deviceDetails: await getDeviceDetails(session.user_agent, session.ip),
      is2FARequired: isVerificationRequired(),
    });

    try {
      await mailer.send({
        to: recipient,
        subject: `${token} is your Ghost sign in verification code`,
        html: email,
      });
    } catch (error) {
      throw new errors.EmailError({
        ...(error as object),
        message: 'Failed to send email. Please check your site configuration and try again.',
      });
    }
  }

  async function verifySession(req: Req, res: Res) {
    const session = await getSession(req, res);
    session.verified = true;
    session.verified_user_id = session.user_id;
    invalidateAuthCodeChallenge(session);
    await clearVerificationEmailLimit(session.user_id as string);
  }

  async function isVerifiedSession(req: Req, res: Res) {
    const session = await getSession(req, res);
    // Verification is bound to a user; a session with no verified_user_id
    // (e.g. logged out, or predating this field) fails closed rather than
    // matching an absent user_id via undefined === undefined
    return (
      session.verified === true &&
      !!session.verified_user_id &&
      session.verified_user_id === session.user_id
    );
  }

  async function removeUserForSession(req: Req, res: Res) {
    const session = await getSession(req, res);

    if (isVerificationRequired()) {
      session.verified = undefined;
      session.verified_user_id = undefined;
    }

    invalidateAuthCodeChallenge(session);
    session.user_id = undefined;
  }

  async function getUserForSession(req: Req, res: Res): Promise<User | null> {
    // CASE: we don't have a cookie header so allow fallthrough to other
    // auth middleware or final "ensure authenticated" check
    if (!req.headers || !req.headers.cookie) {
      return null;
    }

    const session = await getSession(req, res);
    // Enable CSRF bypass (useful for OAuth for example)
    if (!res || !res.locals || !res.locals.bypassCsrfProtection) {
      cookieCsrfProtection(req, session);
    }

    if (!session || !session.user_id) {
      return null;
    }

    try {
      const user = await findUserById({ id: session.user_id });
      return user;
    } catch (err) {
      return null;
    }
  }

  return {
    getUserForSession,
    createSessionForUser,
    createVerifiedSessionForUser,
    assignVerifiedUserToSession,
    rotateAndAssignVerifiedUserToSession,
    removeUserForSession,
    verifySession,
    isVerifiedSession,
    sendAuthCodeToUser,
    verifyAuthCodeForUser,
    generateAuthCodeForUser,
    isVerificationRequired,
  };
}
