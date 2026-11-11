import type { Installation } from './codec';

/** The signed-in staff user an app session is for. */
export interface StaffSession {
  userId: string;
  /** Better Auth's session id. The user's app token ends with this session. */
  sessionId: string;
}

/** What Admin gets for an app session, as the Admin API returns it. */
export interface AppUserTokens {
  /** Opaque. Admin keeps it and sends it as Bearer on the app's Admin API calls. */
  access_token: string;
  /** Signed. Admin hands it to the app's frame, which sends it to the app's backend. */
  id_token: string;
  /** When the access token expires, in Unix seconds. */
  expires_at: number;
  /** When the ID token expires, in Unix seconds. It lives minutes, the access token an hour. */
  id_token_expires_at: number;
}

/** Issues app tokens. Better Auth's OAuth provider implements it; a mock can too. */
export interface AppTokenIssuer {
  createUserClient(input: {
    installationId: string;
    name: string;
    scopes: string[];
  }): Promise<void>;
  issueUserTokens(input: {
    installationId: string;
    staff: StaffSession;
    scopes: string[];
  }): Promise<AppUserTokens>;
}

/**
 * The scopes an Administrator approved for the installation.
 * Unwired: manifests don't declare scopes yet, so every app gets none beyond `openid`.
 */
export function approvedScopesOf(_installation: Installation): string[] {
  return [];
}
