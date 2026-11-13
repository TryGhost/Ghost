import errors from '@tryghost/errors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ANONYMOUS,
  applyPrincipal,
  type ApiKey,
  type AuthenticatedRequest,
  type Integration,
  type Principal,
  type Session,
  type User,
} from './principal';

export interface ResolvePrincipalDeps {
  /** Better Auth's session for these headers, or null */
  getSession(headers: Request['headers']): Promise<{ session: Session } | null>;
  /** The legacy session's origin rule: Origin, else Referer, else the admin URL */
  getOriginOfRequest(req: Request): string | null;
  getAdminOrigin(): string;
  /** An active staff user by id, or null */
  findActiveUser(id: string): Promise<User | null>;
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
    return { kind: 'user', method: 'staff_token', user, apiKey };
  }

  const integration = (apiKey as ApiKey & { relations?: { integration?: Integration } }).relations
    ?.integration;
  return { kind: 'integration', method, apiKey, integration: integration ?? null };
}

export function createPrincipalResolver(deps: ResolvePrincipalDeps) {
  /**
   * The cookie branch: Better Auth's session, pinned to the admin origin and
   * to the origin it was created from. An unverified session is anonymous.
   */
  async function resolveSession(req: Request, res: Response): Promise<Principal> {
    // Fall through to other auth or the final authorization check
    if (!req.headers?.cookie) {
      return ANONYMOUS;
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
      return ANONYMOUS;
    }

    const { session } = result;
    if (checkOrigin && session.origin && session.origin !== origin) {
      throw incorrectOrigin(session.origin, origin);
    }

    if (session.verified !== true) {
      return ANONYMOUS;
    }

    let user: User | null = null;
    try {
      user = await deps.findActiveUser(session.userId);
    } catch {
      // A failed lookup is anonymous, as with the legacy session
    }

    return user ? { kind: 'user', method: 'session', user, session } : ANONYMOUS;
  }

  /** Runs after `api-key/admin.js`: a verified key wins, else the cookie. */
  const adminApi: RequestHandler = async function resolveAdminPrincipal(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const keyed = req as ApiKeyRequest;
      const principal = keyed.api_key
        ? principalFromApiKey(keyed.api_key, keyed.user, 'admin_api_key')
        : await resolveSession(req, res);
      applyPrincipal(keyed, principal);
      next();
    } catch (err) {
      next(err);
    }
  };

  /** Runs after a key middleware that has no cookie fallback. */
  function fromApiKey(method: 'admin_api_key' | 'content_api_key'): RequestHandler {
    return function resolveKeyPrincipal(req: Request, _res: Response, next: NextFunction) {
      const keyed = req as ApiKeyRequest;
      applyPrincipal(
        keyed,
        keyed.api_key ? principalFromApiKey(keyed.api_key, keyed.user, method) : ANONYMOUS,
      );
      next();
    };
  }

  return {
    adminApi,
    adminApiWithUrl: fromApiKey('admin_api_key'),
    contentApi: fromApiKey('content_api_key'),
  };
}
