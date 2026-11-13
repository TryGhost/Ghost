import errors, { utils as errorUtils } from '@tryghost/errors';
import { BASE_ERROR_CODES } from 'better-auth';
import { isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import type { GhostAuth } from './create-auth';
import { SESSION_COOKIE_NAME } from './create-auth';
import { STAFF_LIFECYCLE_ERROR_CODES } from './plugins/staff-lifecycle';

// Legacy messages (`models/user.js`, `api/endpoints/session.js`)
const messages = {
  accessDenied: 'Access Denied.',
  noUserWithEmail: 'There is no user with that email address.',
  accountSuspended: 'Your account was suspended.',
  incorrectPassword: 'Your password is incorrect.',
  incorrectPasswordHelp: 'Visit and save your profile after logging in to check for problems.',
  noOrigin:
    'Could not determine origin of request. Please ensure an Origin or Referrer header is present.',
};

type StaffStatus = { get(key: 'status'): string };

export type SessionControllerDeps = {
  /** Read per call: the instance is built by boot */
  getAuth(): Pick<GhostAuth['api'], 'signInEmail' | 'signOut'>;
  /** The legacy session's origin rule: Origin, else Referer, else the admin URL */
  getOriginOfRequest(req: Request): string | null;
  getAdminOrigin(): string;
  /** Clears this request's failed sign-ins, as legacy sign-in does */
  resetUserLogin(req: Request): Promise<unknown>;
  /** A staff user by email in any status, or null */
  findUserByEmail(email: string): Promise<StaffStatus | null>;
};

// Ghost sets only the session cookie; Better Auth also expires cookies Ghost never sets
const isSessionCookie = (cookie: string) => {
  const name = cookie.slice(0, cookie.indexOf('='));
  return name === SESSION_COOKIE_NAME || name === `__Secure-${SESSION_COOKIE_NAME}`;
};

function forwardSessionCookie(headers: Headers, res: Response) {
  // An array, as express-session sends it
  res.setHeader('Set-Cookie', headers.getSetCookie().filter(isSessionCookie));
}

/**
 * `POST` and `DELETE /session` on Better Auth, with the legacy responses and
 * errors (plan §5.1, §5.3).
 */
export function createSessionController(deps: SessionControllerDeps) {
  // Server-side calls skip Better Auth's origin checks, so this is the login-CSRF check
  function assertAdminOrigin(req: Request) {
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

  /**
   * Better Auth's generic sign-in failure, as legacy sign-in reports it: status
   * before password, so this still enumerates staff (SC-90). The lifecycle
   * plugin has already emailed a locked user.
   */
  async function legacyCredentialsError(email: string) {
    const user = await deps.findUserByEmail(email);
    const status = user?.get('status');
    if (!user) {
      return new errors.NotFoundError({ message: messages.noUserWithEmail });
    }
    if (status === 'locked') {
      return new errors.PasswordResetRequiredError();
    }
    if (status === 'inactive') {
      return new errors.NoPermissionError({ message: messages.accountSuspended });
    }
    return new errors.ValidationError({
      message: messages.incorrectPassword,
      context: messages.incorrectPassword,
      help: messages.incorrectPasswordHelp,
      code: 'PASSWORD_INCORRECT',
    });
  }

  async function toGhostError(err: unknown, email: string) {
    if (!isAPIError(err)) {
      return errorUtils.isGhostError(err as Error)
        ? err
        : new errors.UnauthorizedError({ message: messages.accessDenied, err: err as Error });
    }

    switch (err.body?.code) {
      case BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code:
      case BASE_ERROR_CODES.INVALID_EMAIL.code:
        return legacyCredentialsError(email);
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
      assertAdminOrigin(req);

      let headers: Headers;
      try {
        // `headers` without `request`, so Better Auth returns headers rather than a Response
        ({ headers } = await deps.getAuth().signInEmail({
          body: { email, password },
          headers: fromNodeHeaders(req.headers),
          returnHeaders: true,
        }));
      } catch (err) {
        throw await toGhostError(err, email);
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
