import errors from '@tryghost/errors';
import { userView, type ApiTokenView, type Principal, type User } from './principal';

/** Personal Access Tokens: `apiKey` keys of the `pat` configuration. */
export const PAT_PREFIX = 'ghost_pat_';
export const PAT_CONFIG_ID = 'pat';

/** What `auth.api.verifyApiKey` answers; it reports failures in the body. */
export interface VerifyApiKeyResult {
  valid: boolean;
  error: { code?: string; message?: string } | null;
  key: { id: string; referenceId: string; configId?: string | null } | null;
}

export interface BearerDeps {
  /** `auth.api.verifyApiKey`, or null where `api_tokens` doesn't exist */
  getVerifyApiKey():
    | ((body: { key: string; configId: string }) => Promise<VerifyApiKeyResult>)
    | null;
  /** An active staff user by id, with roles, or null */
  findActiveUser(id: string): Promise<User | null>;
}

export interface BearerResult {
  principal: Principal;
  user: User;
}

const messages = {
  invalidToken: 'Invalid token',
  expiredToken: 'Token expired',
  rateLimited: 'Too many requests with this token',
};

/**
 * The token of an `Authorization: Bearer` header, which may be empty, or null
 * for any other scheme.
 */
export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer(?:\s+(.*))?$/i.exec(header ?? '');
  return match ? (match[1] ?? '').trim() : null;
}

function invalidToken(code = 'INVALID_BEARER_TOKEN', message = messages.invalidToken) {
  return new errors.UnauthorizedError({ message, code });
}

/**
 * Routes a Bearer token by prefix (plan §3.4). Only Personal Access Tokens
 * exist so far; app tokens (Phase 4b) add a prefix here. Session tokens have
 * no prefix, so they are never accepted.
 */
export function createBearerAuthenticator(deps: BearerDeps) {
  async function personalAccessToken(token: string): Promise<BearerResult> {
    const verifyApiKey = deps.getVerifyApiKey();
    if (!verifyApiKey) {
      throw invalidToken();
    }

    // The config id stops a key from another configuration passing as a PAT
    const result = await verifyApiKey({ key: token, configId: PAT_CONFIG_ID });
    if (!result.valid || !result.key) {
      switch (result.error?.code) {
        case 'KEY_EXPIRED':
          throw invalidToken('BEARER_TOKEN_EXPIRED', messages.expiredToken);
        case 'RATE_LIMITED':
        case 'USAGE_EXCEEDED':
          throw new errors.TooManyRequestsError({
            message: messages.rateLimited,
            code: 'BEARER_TOKEN_RATE_LIMITED',
          });
        default:
          throw invalidToken();
      }
    }

    // A suspended or locked user's tokens stop working at once
    const user = await deps.findActiveUser(result.key.referenceId);
    if (!user) {
      throw invalidToken();
    }

    const apiToken: ApiTokenView = Object.freeze({ id: result.key.id });
    return {
      principal: { kind: 'user', method: 'bearer_token', user: userView(user), apiToken },
      user,
    };
  }

  return async function authenticateBearer(token: string): Promise<BearerResult> {
    if (token.startsWith(PAT_PREFIX)) {
      return personalAccessToken(token);
    }
    throw invalidToken();
  };
}

export type AuthenticateBearer = ReturnType<typeof createBearerAuthenticator>;
