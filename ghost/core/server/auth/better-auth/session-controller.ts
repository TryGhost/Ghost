import errors, { utils as errorUtils } from '@tryghost/errors';
import { BASE_ERROR_CODES } from '@better-auth/core/error';
import { isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import type { GhostAuth } from './create-auth';
import { DEVICE_COOKIE_NAME, SESSION_COOKIE_NAME } from './create-auth';
import { DEVICE_VERIFICATION_ERROR_CODES } from './plugins/device-verification';
import { STAFF_LIFECYCLE_ERROR_CODES } from './plugins/staff-lifecycle';

// Legacy messages (`models/user.js`, `api/endpoints/session.js`), plus one generic sign-in error
const messages = {
  accessDenied: 'Access Denied.',
  accountSuspended: 'Your account was suspended.',
  incorrectCredentials: 'Your email or password is incorrect.',
  noOrigin:
    'Could not determine origin of request. Please ensure an Origin or Referrer header is present.',
  codeSent:
    'A 6-digit sign-in verification code has been sent to your email to keep your account safe.',
  noSessionUser: 'Could not fetch user from the session.',
  tooManyAttempts: 'Too many attempts.',
};

const NEEDS_2FA: string[] = [
  DEVICE_VERIFICATION_ERROR_CODES.TOKEN_REQUIRED.code,
  DEVICE_VERIFICATION_ERROR_CODES.NEW_DEVICE_DETECTED.code,
];

// Where better-call keeps the headers an endpoint set before an APIError
const API_ERROR_HEADERS = Symbol.for('better-call:api-error-headers');

export type SessionControllerDeps = {
  /** Read per call: the instance is built by boot */
  getAuth(): Pick<
    GhostAuth['api'],
    'signInEmail' | 'signOut' | 'sendDeviceVerification' | 'verifyDevice'
  >;
  /** The legacy session's origin rule: Origin, else Referer, else the admin URL */
  getOriginOfRequest(req: Request): string | null;
  getAdminOrigin(): string;
  /** Clears this request's failed sign-ins, as legacy sign-in does */
  resetUserLogin(req: Request): Promise<unknown>;
};

// Ghost sets only the session and device-trust cookies; Better Auth also expires cookies Ghost never sets
const GHOST_COOKIES = [SESSION_COOKIE_NAME, DEVICE_COOKIE_NAME].flatMap((name) => [
  name,
  `__Secure-${name}`,
]);
const isSessionCookie = (cookie: string) =>
  GHOST_COOKIES.includes(cookie.slice(0, cookie.indexOf('=')));

/** Better Auth's `Set-Cookie` headers, without the cookies Ghost never sets */
export const sessionCookies = (headers: Headers) => headers.getSetCookie().filter(isSessionCookie);

function forwardSessionCookie(headers: Headers, res: Response) {
  // An array, as express-session sends it
  res.setHeader('Set-Cookie', sessionCookies(headers));
}

// Headers an endpoint set before it threw
function forwardErrorCookies(err: unknown, res: Response) {
  const headers = (err as Record<symbol, unknown>)?.[API_ERROR_HEADERS];
  if (headers instanceof Headers) {
    forwardSessionCookie(headers, res);
  }
}

type OriginDeps = Pick<SessionControllerDeps, 'getOriginOfRequest' | 'getAdminOrigin'>;

// Server-side calls skip Better Auth's origin checks, so this is the login-CSRF check
function assertAdminOrigin(deps: OriginDeps, req: Request) {
  const origin = deps.getOriginOfRequest(req);
  if (!origin) {
    throw new errors.BadRequestError({ message: messages.noOrigin });
  }
  const adminOrigin = deps.getAdminOrigin();
  if (origin !== adminOrigin) {
    throw new errors.BadRequestError({
      message: `Request made from incorrect origin. Expected '${adminOrigin}' received '${origin}'.`,
    });
  }
}

/** The login-CSRF check for a route whose controller creates a session it can't see the request of */
export function requireAdminOrigin(deps: OriginDeps) {
  return function requireAdminOriginMw(req: Request, _res: Response, next: NextFunction) {
    try {
      assertAdminOrigin(deps, req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * `/session` and `/session/verify` on Better Auth, with the legacy responses
 * and errors (plan §5.1, §5.3).
 */
export function createSessionController(deps: SessionControllerDeps) {
  // One error for an unknown email or a wrong password, so sign-in does not enumerate staff
  // (status errors need a matching password). The lifecycle plugin has already emailed a locked user.
  const credentialsError = () =>
    new errors.ValidationError({ message: messages.incorrectCredentials });

  function toGhostError(err: unknown) {
    if (!isAPIError(err)) {
      return errorUtils.isGhostError(err as Error)
        ? err
        : new errors.UnauthorizedError({ message: messages.accessDenied, err: err as Error });
    }

    const code = err.body?.code;
    if (code && NEEDS_2FA.includes(code)) {
      return new errors.NoPermissionError({
        code,
        context: messages.codeSent,
        errorType: 'Needs2FAError',
        message: err.message,
      });
    }

    switch (code) {
      case DEVICE_VERIFICATION_ERROR_CODES.TOO_MANY_EMAILS.code:
        return new errors.TooManyRequestsError({
          message: err.message,
          context: messages.tooManyAttempts,
        });
      case DEVICE_VERIFICATION_ERROR_CODES.EMAIL_FAILED.code:
        return new errors.EmailError({ message: err.message, err });
      case BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code:
      case BASE_ERROR_CODES.INVALID_EMAIL.code:
        return credentialsError();
      case STAFF_LIFECYCLE_ERROR_CODES.PASSWORD_RESET_REQUIRED.code:
        return new errors.PasswordResetRequiredError();
      case STAFF_LIFECYCLE_ERROR_CODES.ACCOUNT_SUSPENDED.code:
        return new errors.NoPermissionError({ message: messages.accountSuspended });
      default:
        if (err.statusCode === 429) {
          return new errors.TooManyRequestsError({ message: err.message, err });
        }
        return new errors.UnauthorizedError({ message: messages.accessDenied, err: err as Error });
    }
  }

  async function signIn(
    req: Request,
    res: Response,
    next: NextFunction,
    { email, password, token }: { email: string; password: string; token?: string },
  ) {
    try {
      assertAdminOrigin(deps, req);

      let headers: Headers;
      try {
        // `headers` without `request`, so Better Auth returns headers rather than a Response
        // The device verification plugin reads an inline `token` before validation strips it
        ({ headers } = await deps.getAuth().signInEmail({
          body: { email, password, ...(token ? { token } : {}) },
          headers: fromNodeHeaders(req.headers),
          returnHeaders: true,
        }));
      } catch (err) {
        // An unverified session keeps its cookie, so the browser can verify it
        forwardErrorCookies(err, res);
        throw toGhostError(err);
      }

      await deps.resetUserLogin(req);
      forwardSessionCookie(headers, res);
      res.sendStatus(201);
    } catch (err) {
      next(err);
    }
  }

  async function signOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { headers } = await deps.getAuth().signOut({
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });
      forwardSessionCookie(headers, res);
      res.sendStatus(204);
    } catch (err) {
      next(
        errorUtils.isGhostError(err as Error)
          ? err
          : new errors.InternalServerError({ err: err as Error }),
      );
    }
  }

  async function sendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      assertAdminOrigin(deps, req);
      await deps.getAuth().sendDeviceVerification({ headers: fromNodeHeaders(req.headers) });
      res.sendStatus(200);
    } catch (err) {
      // No session, or a verified one, which the gate does not let through
      if (isAPIError(err) && err.statusCode === 401) {
        return next(new errors.BadRequestError({ message: messages.noSessionUser }));
      }
      next(toGhostError(err));
    }
  }

  async function verify(req: Request, res: Response, next: NextFunction) {
    try {
      assertAdminOrigin(deps, req);
      const token = req.body?.token;
      if (typeof token !== 'string' || !token) {
        res.sendStatus(401);
        return;
      }

      const { headers } = await deps.getAuth().verifyDevice({
        body: { code: token },
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });
      // The device-trust cookie
      forwardSessionCookie(headers, res);
      res.sendStatus(200);
    } catch (err) {
      // A wrong code, or no session to verify: legacy answers a bare 401
      if (isAPIError(err) && err.statusCode === 401) {
        res.sendStatus(401);
        return;
      }
      next(toGhostError(err));
    }
  }

  return { signIn, signOut, sendVerification, verify };
}
