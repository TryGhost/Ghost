import errors from '@tryghost/errors';

/** A Bookshelf model, loaded by id during the transition (plan §3.4). */
export interface ModelLike {
  id: string;
  get(attribute: string): unknown;
}

export type User = ModelLike;
export type ApiKey = ModelLike;
export type Integration = ModelLike;

/** Token scopes, as `object_type:action` keys; populated from Phase 4. */
export type Scopes = readonly string[];

/** The Better Auth session behind a cookie principal. */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  verified?: boolean | null;
  origin?: string | null;
}

/** Whoever made a request; every credential resolves to exactly one. */
export type Principal =
  | {
      kind: 'user';
      method: 'session' | 'staff_token' | 'bearer_token' | 'sso';
      user: User;
      session?: Session;
      apiKey?: ApiKey;
      scopes?: Scopes;
    }
  | {
      kind: 'integration';
      method: 'admin_api_key' | 'content_api_key';
      apiKey: ApiKey;
      integration: Integration | null;
      scopes?: Scopes;
    }
  | { kind: 'internal' }
  | { kind: 'anonymous' };

export const ANONYMOUS: Principal = Object.freeze({ kind: 'anonymous' });

/** The request fields the API framework derives `frame.options.context` from. */
export interface AuthenticatedRequest {
  auth?: Principal;
  user?: User | null;
  api_key?: ApiKey | null;
}

/**
 * Sets `req.auth` and derives `req.user` and `req.api_key` from it. An
 * anonymous principal leaves `req.user` alone, as the legacy session
 * middleware does, since an earlier middleware may have set it.
 */
export function applyPrincipal(req: AuthenticatedRequest, principal: Principal): void {
  switch (principal.kind) {
    case 'user':
      req.user = principal.user;
      req.api_key = principal.apiKey ?? null;
      break;
    case 'integration':
      req.api_key = principal.apiKey;
      break;
    case 'anonymous':
      break;
    default:
      // Unmapped kinds would otherwise reach permissions as a public context
      throw new errors.IncorrectUsageError({
        message: `No request mapping for principal kind '${principal.kind}'.`,
      });
  }

  req.auth = principal;
}
