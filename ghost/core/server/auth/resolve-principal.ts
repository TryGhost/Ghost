import errors from '@tryghost/errors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ANONYMOUS,
  apiKeyView,
  applyPrincipal,
  integrationView,
  sessionView,
  userView,
  type ApiKey,
  type AuthenticatedRequest,
  type Principal,
  type Session,
  type SessionView,
  type User,
} from './principal';
import { bearerToken, type AuthenticateBearer } from './bearer';

export interface ResolvePrincipalDeps {
  /** Better Auth's session for these headers, or null */
  getSession(headers: Request['headers']): Promise<{ session: Session } | null>;
  /** The legacy session's origin rule: Origin, else Referer, else the admin URL */
  getOriginOfRequest(req: Request): string | null;
  getAdminOrigin(): string;
  /** An active staff user by id, or null */
  findActiveUser(id: string): Promise<User | null>;
  authenticateBearer: AuthenticateBearer;
}

type ApiKeyRequest = Request & AuthenticatedRequest;

function incorrectOrigin(expected: string, received: string | null) {
  return new errors.BadRequestError({
    message: `Request made from incorrect origin. Expected '${expected}' received '${received}'.`,
  });
}

/** The principal for a key that the `api-key` middleware already verified. */
export function principalFromApiKey(
  apiKey: ApiKey,
  user: User | null | undefined,
  method: 'admin_api_key' | 'content_api_key',
): Principal {
  // Staff tokens have a user and no integration
  if (apiKey.get('user_id') && user) {
    return {
      kind: 'user',
      method: 'staff_token',
      user: userView(user),
      apiKey: apiKeyView(apiKey),
    };
  }

  // A key whose integration row is gone loads an empty, id-less model
  const integration = apiKey.relations?.integration;
  return {
    kind: 'integration',
    method,
    apiKey: apiKeyView(apiKey),
    integration: integration?.id ? integrationView(integration) : null,
  };
}

/** Sets the principal for a verified key, keeping the key middleware's models on the request. */
function applyKeyPrincipal(
  keyed: ApiKeyRequest,
  apiKey: ApiKey,
  method: 'admin_api_key' | 'content_api_key',
) {
  applyPrincipal(keyed, principalFromApiKey(apiKey, keyed.user, method), {
    user: keyed.user,
    apiKey,
  });
}

/** Runs after a key middleware that has no cookie fallback. */
export function fromApiKey(method: 'admin_api_key' | 'content_api_key'): RequestHandler {
  return function resolveKeyPrincipal(req: Request, _res: Response, next: NextFunction) {
    const keyed = req as ApiKeyRequest;
    if (keyed.api_key) {
      applyKeyPrincipal(keyed, keyed.api_key, method);
    } else {
      applyPrincipal(keyed, ANONYMOUS);
    }
    next();
  };
}

/**
 * Under the legacy engine, runs the session middleware only when no key was
 * verified, so a cookie's user never replaces a key's caller, as under better-auth.
 */
export function unlessKeyed(handler: RequestHandler): RequestHandler {
  return function skipWhenKeyed(req: Request, res: Response, next: NextFunction) {
    if ((req as ApiKeyRequest).api_key) {
      return next();
    }
    return handler(req, res, next);
  };
}

/**
 * The legacy engine's Admin API principal, read from what the key and session
 * middleware already set, so `req.user` and `req.api_key` keep their values.
 */
export const legacyAdminApi: RequestHandler = function resolveLegacyAdminPrincipal(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const keyed = req as ApiKeyRequest;
  if (keyed.api_key) {
    applyKeyPrincipal(keyed, keyed.api_key, 'admin_api_key');
  } else if (keyed.user) {
    const principal: Principal = { kind: 'user', method: 'session', user: userView(keyed.user) };
    applyPrincipal(keyed, principal, { user: keyed.user });
  } else {
    applyPrincipal(keyed, ANONYMOUS);
  }
  next();
};

export function createPrincipalResolver(deps: ResolvePrincipalDeps) {
  /**
   * The cookie branch: Better Auth's session, pinned to the admin origin and
   * to the origin it was created from. An unverified session is anonymous.
   */
  async function resolveSession(
    req: Request,
    res: Response,
  ): Promise<{ user: User; session: SessionView } | null> {
    // Fall through to other auth or the final authorization check
    if (!req.headers?.cookie) {
      return null;
    }

    // Lets a route opt out, as with the legacy session (OAuth callbacks)
    const checkOrigin = !res.locals?.bypassCsrfProtection;
    const origin = deps.getOriginOfRequest(req);
    const adminOrigin = deps.getAdminOrigin();

    if (checkOrigin && origin !== adminOrigin) {
      throw incorrectOrigin(adminOrigin, origin);
    }

    const result = await deps.getSession(req.headers);
    if (!result) {
      return null;
    }

    const session = sessionView(result.session);

    // Every session is pinned to its origin; one without is never trusted
    if (!session.origin) {
      return null;
    }

    if (checkOrigin && session.origin !== origin) {
      throw incorrectOrigin(session.origin, origin);
    }

    if (session.verified !== true) {
      return null;
    }

    let user: User | null = null;
    try {
      user = await deps.findActiveUser(session.userId);
    } catch {
      // A failed lookup is anonymous, as with the legacy session
    }

    return user ? { user, session } : null;
  }

  /**
   * Runs after `api-key/admin.ts`: a verified key wins, then a Bearer token,
   * which that middleware passes through. The cookie is read only when no
   * Authorization header was sent, so a token that failed verification never
   * falls back to the staff session.
   */
  const adminApi: RequestHandler = async function resolveAdminPrincipal(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const keyed = req as ApiKeyRequest;
      if (keyed.api_key) {
        applyKeyPrincipal(keyed, keyed.api_key, 'admin_api_key');
        return next();
      }

      const token = bearerToken(req.headers?.authorization);
      if (token !== null) {
        const { principal, user } = await deps.authenticateBearer(token);
        applyPrincipal(keyed, principal, { user });
        return next();
      }

      const resolved = req.headers?.authorization ? null : await resolveSession(req, res);
      if (resolved) {
        const { user, session } = resolved;
        applyPrincipal(
          keyed,
          { kind: 'user', method: 'session', user: userView(user), session },
          { user },
        );
      } else {
        applyPrincipal(keyed, ANONYMOUS);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  return {
    adminApi,
    adminApiWithUrl: fromApiKey('admin_api_key'),
    contentApi: fromApiKey('content_api_key'),
  };
}
