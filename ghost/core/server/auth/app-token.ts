import errors from '@tryghost/errors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  applyPrincipal,
  sessionView,
  userView,
  type AuthenticatedRequest,
  type Principal,
  type User,
} from './principal';
import { findActiveStaffUser } from './staff-users';
import { APP_TOKEN_PREFIX } from './app-token-prefix';
import { appNotAllowed } from './policy/app-refusals';
import type { ValidatedAppToken } from './better-auth/app-tokens';
import type { InstallationAccess } from '../services/app-installations';

/**
 * The app token in an `Authorization` header. Any Bearer credential that looks like an app
 * token, in any case or spacing, is claimed: a malformed one is refused here rather than left to
 * the key check and the cookie. The scheme is case-insensitive; a valid token is
 * `Bearer ghost_app_…` with one space and nothing after it.
 */
function appTokenOf(header: string | undefined): { token: string } | 'malformed' | null {
  const bearer = /^bearer\s+(.*)$/is.exec(header ?? '');
  if (!bearer || !bearer[1].trimStart().toLowerCase().startsWith(APP_TOKEN_PREFIX)) {
    return null;
  }
  const valid = new RegExp(`^bearer (${APP_TOKEN_PREFIX}\\S+)$`, 'i').exec(header ?? '');
  return valid?.[1].startsWith(APP_TOKEN_PREFIX) ? { token: valid[1] } : 'malformed';
}

export interface AppTokenDeps {
  /** The `apps` flag, read per request: Better Auth's plugins are fixed at boot */
  isAppsEnabled(): boolean;
  /** Null unless the token is active and its staff session is verified and unexpired */
  validate(token: string): Promise<ValidatedAppToken | null>;
  /** The installation's status and approved scopes; null only when there's none */
  findInstallation(id: string): Promise<InstallationAccess | null>;
  /** An active staff user by id, with roles, or null */
  findActiveUser(id: string): Promise<User | null>;
}

function refused(message: string) {
  return new errors.UnauthorizedError({ message, code: 'APP_TOKEN_INVALID' });
}

// Every handler `createAppTokenAuthentication` has made, so a route can be asked whether it
// runs one
const authentications = new WeakSet<object>();

/** Whether a route handler is app token authentication. */
export function authenticatesAppTokens(handler: unknown): boolean {
  return typeof handler === 'function' && authentications.has(handler);
}

/**
 * Admin API authentication for app tokens, ahead of the key check. It acts only on
 * `Authorization: Bearer ghost_app_…`; every other request passes untouched. A token that
 * is refused for any reason is an error here, never a fall back to the staff cookie.
 *
 * The installation, the user and the staff session are read on every call, and the scopes
 * come from the installation's approved manifest, so a suspension, an uninstall or an
 * OAuth client out of step with its installation grants nothing.
 */
export function createAppTokenAuthentication(deps: AppTokenDeps): RequestHandler {
  async function principalFor(token: string): Promise<{ principal: Principal; user: User }> {
    if (!deps.isAppsEnabled()) {
      throw refused('Apps are not enabled on this site.');
    }
    const validated = await deps.validate(token);
    if (!validated) {
      throw refused('The app token is invalid or has expired.');
    }
    const [installation, user] = await Promise.all([
      deps.findInstallation(validated.installationId),
      deps.findActiveUser(validated.userId),
    ]);
    if (installation?.status !== 'active') {
      throw refused('The app is not active.');
    }
    if (!user) {
      throw refused('The staff user behind the app token is not active.');
    }
    return {
      principal: {
        kind: 'app',
        method: 'app_user_token',
        app: { id: installation.id },
        actingFor: userView(user),
        session: sessionView({
          ...validated.session,
          userId: validated.userId,
          verified: true,
        }),
        scopes: [...installation.scopes],
      },
      user,
    };
  }

  async function authenticateAppToken(req: Request, _res: Response, next: NextFunction) {
    const claimed = appTokenOf(req.headers?.authorization);
    if (!claimed) {
      return next();
    }
    try {
      if (claimed === 'malformed') {
        throw refused('The app token is malformed.');
      }
      const { principal, user } = await principalFor(claimed.token);
      applyPrincipal(req as Request & AuthenticatedRequest, principal, { user });
      next();
    } catch (err) {
      next(err);
    }
  }
  authentications.add(authenticateAppToken);
  return authenticateAppToken;
}

/**
 * The middleware as the Admin API mounts it under the `better-auth` engine. Every dependency is
 * read per call: the app installations service and Better Auth are built by boot.
 */
export function appTokenAuthentication(): RequestHandler {
  return createAppTokenAuthentication({
    isAppsEnabled: () => require('../../shared/labs').isSet('apps'),
    validate: (token) => require('./better-auth/app-tokens').default().validate(token),
    findInstallation: (id) =>
      require('../services/app-installations').default.service.readAccess(id),
    findActiveUser: findActiveStaffUser,
  });
}

/** Skips `handler` for a request an app token already authenticated. */
export function unlessAppToken(handler: RequestHandler): RequestHandler {
  return function skipForAppToken(req: Request, res: Response, next: NextFunction) {
    if ((req as Request & AuthenticatedRequest).auth?.kind === 'app') {
      return next();
    }
    return handler(req, res, next);
  };
}

/**
 * Refuses a request that carries an app token nothing has authenticated: one on a route that
 * takes whoever calls, such as signing in or asking for a password reset. Such a route would
 * otherwise treat the app as the browser it runs in, so the app's attempts would count against
 * the publisher's rate limits and send staff their emails. Whether the token is valid makes no
 * difference: no app may call the route.
 *
 * It goes ahead of everything else on a route, its rate limiters included. The Admin API's
 * routers add it to every route that doesn't start with app token authentication (see
 * `web/api/endpoints/admin/app-token-routes.ts`).
 */
export function refuseUnauthenticatedAppToken(req: Request, _res: Response, next: NextFunction) {
  const authenticated = (req as Request & AuthenticatedRequest).auth?.kind === 'app';
  if (!authenticated && appTokenOf(req.headers?.authorization)) {
    return next(appNotAllowed());
  }
  return next();
}
