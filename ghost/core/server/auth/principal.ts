import errors from '@tryghost/errors';
import { deepFreeze } from '../../shared/deep-freeze';

/** A Bookshelf model, loaded by id during the transition (plan §3.4). */
export interface ModelLike {
  id: string;
  get(attribute: string): unknown;
}

export type Integration = ModelLike;

/** A role model; an empty one, for a key with no role, has no id */
export interface Role {
  id?: string;
  get(attribute: string): unknown;
}

export interface User extends ModelLike {
  /** Set when the user was loaded with `withRelated: ['roles']` */
  relations?: { roles?: { models: Role[] } };
}

export interface ApiKey extends ModelLike {
  /** Set when the key was loaded with `withRelated: ['integration', 'role']` */
  relations?: { integration?: Integration; role?: Role };
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

export interface RoleView {
  readonly id: string;
  readonly name: string;
}

// Views are picked field by field, so a password or key secret never rides on req.auth
export interface UserView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly status: string;
  readonly roles: readonly RoleView[];
}

export interface ApiKeyView {
  readonly id: string;
  readonly type: string;
  readonly user_id: string | null;
  readonly integration_id: string | null;
  /** Null for a content key, and for an admin key with no role */
  readonly role: RoleView | null;
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

// Provisional until PLA-631 settles the app principal's fields; keep it minimal
export interface AppInstallationView {
  readonly id: string;
}

function relationNotLoaded(model: string, relation: string) {
  return new errors.IncorrectUsageError({
    message: `A ${model} view needs the ${model} loaded with its ${relation}.`,
  });
}

function roleView(role: Role): RoleView {
  const { id } = role;
  const name = role.get('name');
  // A role without both would grant nothing it should, so fail loudly
  if (typeof id !== 'string' || typeof name !== 'string') {
    throw new errors.IncorrectUsageError({
      message: 'A role view needs a role with an id and name.',
    });
  }
  return Object.freeze({ id, name });
}

export function userView(user: User): UserView {
  // Missing roles would deny every check, so fail loudly instead
  const roles = user.relations?.roles;
  if (!roles) {
    throw relationNotLoaded('user', 'roles');
  }

  return Object.freeze({
    id: user.id,
    email: user.get('email') as string,
    name: user.get('name') as string,
    status: user.get('status') as string,
    roles: Object.freeze(roles.models.map(roleView)),
  });
}

export function apiKeyView(apiKey: ApiKey): ApiKeyView {
  const type = apiKey.get('type') as string;
  // Bookshelf leaves no relation for a null role_id, as on content keys, which skip loading it
  const role = apiKey.relations?.role;
  if (!role && (apiKey.get('role_id') ?? null) !== null) {
    throw relationNotLoaded('key', 'role');
  }

  return Object.freeze({
    id: apiKey.id,
    type,
    user_id: (apiKey.get('user_id') as string | null | undefined) ?? null,
    integration_id: (apiKey.get('integration_id') as string | null | undefined) ?? null,
    role: role?.id ? roleView(role) : null,
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
      // `setup` is the new Owner finishing setup in-process
      method: 'session' | 'staff_token' | 'bearer_token' | 'sso' | 'setup';
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
  | {
      // Field names are provisional until PLA-631; scopes are required, and missing scopes mean no access
      kind: 'app';
      method: 'oauth_authorization_code' | 'oauth_client_credentials';
      app: AppInstallationView;
      actingFor: UserView | null;
      scopes: Scopes;
    }
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
 * session middleware does, since an earlier middleware may have set it. An
 * app principal sets `req.user` to the user it acts for, or none, and clears
 * `req.api_key`.
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
    case 'app':
      // Acts as `actingFor` when set, else as no user; never as a key
      if (principal.actingFor?.id !== models.user?.id) {
        throw new errors.IncorrectUsageError({
          message: "An 'app' principal's user model must match its actingFor user.",
        });
      }
      req.user = principal.actingFor ? (models.user ?? null) : null;
      req.api_key = null;
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
