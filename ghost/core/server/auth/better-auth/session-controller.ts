import errors, { utils as errorUtils } from '@tryghost/errors';
import { BASE_ERROR_CODES } from 'better-auth';
import { isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import type { GhostAuth } from './create-auth';
import { SESSION_COOKIE_NAME } from './create-auth';
import { STAFF_LIFECYCLE_ERROR_CODES } from './plugins/staff-lifecycle';

// Legacy messages (`models/user.js`, `api/endpoints/session.js`), plus one generic sign-in error
const messages = {
  accessDenied: 'Access Denied.',
  accountSuspended: 'Your account was suspended.',
  incorrectCredentials: 'Your email or password is incorrect.',
  noOrigin:
    'Could not determine origin of request. Please ensure an Origin or Referrer header is present.',
};

export type SessionControllerDeps = {
  /** Read per call: the instance is built by boot */
  getAuth(): Pick<GhostAuth['api'], 'signInEmail' | 'signOut'>;
  /** The legacy session's origin rule: Origin, else Referer, else the admin URL */
  getOriginOfRequest(req: Request): string | null;
  getAdminOrigin(): string;
  /** Clears this request's failed sign-ins, as legacy sign-in does */
  resetUserLogin(req: Request): Promise<unknown>;
};

// Ghost sets only the session cookie; Better Auth also expires cookies Ghost never sets
const isSessionCookie = (cookie: string) => {
  const name = cookie.slice(0, cookie.indexOf('='));
  return name === SESSION_COOKIE_NAME || name === `__Secure-${SESSION_COOKIE_NAME}`;
};

/** Better Auth's `Set-Cookie` headers, without the cookies Ghost never sets */
export const sessionCookies = (headers: Headers) => headers.getSetCookie().filter(isSessionCookie);

function forwardSessionCookie(headers: Headers, res: Response) {
  // An array, as express-session sends it
  res.setHeader('Set-Cookie', sessionCookies(headers));
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
 * `POST` and `DELETE /session` on Better Auth, with the legacy responses and
 * errors (plan §5.1, §5.3).
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

    switch (err.body?.code) {
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
    { email, password }: { email: string; password: string },
  ) {
    try {
      assertAdminOrigin(deps, req);

      let headers: Headers;
      try {
        // `headers` without `request`, so Better Auth returns headers rather than a Response
        ({ headers } = await deps.getAuth().signInEmail({
          body: { email, password },
          headers: fromNodeHeaders(req.headers),
          returnHeaders: true,
        }));
      } catch (err) {
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

  return { signIn, signOut };
}
