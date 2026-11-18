import errors from '@tryghost/errors';
import { deepFreeze } from '../../shared/deep-freeze';

/** A Bookshelf model, loaded by id during the transition (plan §3.4). */
export interface ModelLike {
  id: string;
  get(attribute: string): unknown;
}

export type User = ModelLike;
export type Integration = ModelLike;

export interface ApiKey extends ModelLike {
  /** Set when the key was loaded with `withRelated: ['integration']` */
  relations?: { integration?: Integration };
}

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

// Views are picked field by field, so a password or key secret never rides on req.auth
export interface UserView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly status: string;
}

export interface ApiKeyView {
  readonly id: string;
  readonly type: string;
  readonly user_id: string | null;
  readonly integration_id: string | null;
}

/** Expiry as epoch ms: a frozen `Date` can still be changed with `setTime`. */
export interface SessionView {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: number;
  readonly verified: boolean | null;
  readonly origin: string | null;
}

export interface IntegrationView {
  readonly id: string;
  readonly type: string;
  readonly slug: string;
}

export function userView(user: User): UserView {
  return Object.freeze({
    id: user.id,
    email: user.get('email') as string,
    name: user.get('name') as string,
    status: user.get('status') as string,
  });
}

export function apiKeyView(apiKey: ApiKey): ApiKeyView {
  return Object.freeze({
    id: apiKey.id,
    type: apiKey.get('type') as string,
    user_id: (apiKey.get('user_id') as string | null | undefined) ?? null,
    integration_id: (apiKey.get('integration_id') as string | null | undefined) ?? null,
  });
}

// Picked field by field, so the session token never rides on req.auth
export function sessionView(session: Session): SessionView {
  return Object.freeze({
    id: session.id,
    userId: session.userId,
    expiresAt: new Date(session.expiresAt).getTime(),
    verified: session.verified ?? null,
    origin: session.origin ?? null,
  });
}

export function integrationView(integration: Integration): IntegrationView {
  return Object.freeze({
    id: integration.id,
    type: integration.get('type') as string,
    slug: integration.get('slug') as string,
  });
}

/** Whoever made a request; every credential resolves to exactly one. */
export type Principal =
  | {
      kind: 'user';
      method: 'session' | 'staff_token' | 'bearer_token' | 'sso';
      user: UserView;
      session?: SessionView;
      apiKey?: ApiKeyView;
      scopes?: Scopes;
    }
  | {
      kind: 'integration';
      method: 'admin_api_key' | 'content_api_key';
      apiKey: ApiKeyView;
      integration: IntegrationView | null;
      scopes?: Scopes;
    }
  // The `app` kind goes here (PLA-631); its scopes are required, and missing scopes mean no access
  | { kind: 'internal' }
  | { kind: 'anonymous' };

export const ANONYMOUS: Principal = Object.freeze({ kind: 'anonymous' });

/** The models `req.user` and `req.api_key` carry until their readers move to `req.auth`. */
export interface PrincipalModels {
  user?: User | null;
  apiKey?: ApiKey | null;
}

/** The request fields the API framework derives `frame.options.context` from. */
export interface AuthenticatedRequest {
  auth?: Principal;
  user?: User | null;
  api_key?: ApiKey | null;
}

function missingModel(kind: string, model: string) {
  return new errors.IncorrectUsageError({
    message: `A '${kind}' principal needs its ${model} model.`,
  });
}

/**
 * Sets `req.auth`, frozen, and `req.user` and `req.api_key` from the models
 * behind it. An anonymous principal leaves `req.user` alone, as the legacy
 * session middleware does, since an earlier middleware may have set it.
 */
export function applyPrincipal(
  req: AuthenticatedRequest,
  principal: Principal,
  models: PrincipalModels = {},
): void {
  switch (principal.kind) {
    case 'user':
      if (!models.user) {
        throw missingModel(principal.kind, 'user');
      }
      req.user = models.user;
      req.api_key = models.apiKey ?? null;
      break;
    case 'integration':
      if (!models.apiKey) {
        throw missingModel(principal.kind, 'api key');
      }
      req.api_key = models.apiKey;
      break;
    case 'anonymous':
      break;
    default:
      // Unmapped kinds would otherwise reach permissions as a public context
      throw new errors.IncorrectUsageError({
        message: `No request mapping for principal kind '${principal.kind}'.`,
      });
  }

  // Fresh root and scopes, so deepFreeze walks every field and never freezes the caller's array
  const scopes = 'scopes' in principal && principal.scopes ? [...principal.scopes] : undefined;
  req.auth = deepFreeze(scopes ? { ...principal, scopes } : { ...principal });
}
