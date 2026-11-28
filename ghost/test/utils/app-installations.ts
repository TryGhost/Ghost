import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import type { TestAppKeys } from './app-identity';

/**
 * An installation as Ghost stores one after an install, running a manifest with `scopes`,
 * without fetching or signing anything. Returns its id.
 */
export async function insertTestInstallation(
  knex: Knex,
  {
    scopes,
    status = 'active',
    keys,
  }: { scopes: string[]; status?: 'active' | 'suspended' | 'uninstalled'; keys: TestAppKeys },
): Promise<string> {
  const id = new ObjectId().toHexString();
  const manifestId = new ObjectId().toHexString();
  const appId = `com.example.app${id}`;
  const manifestUrl = 'https://app.example.com/ghost-app.json';
  const now = new Date();
  await knex('app_installations').insert({
    id,
    app_id: appId,
    current_app_id: status === 'uninstalled' ? null : appId,
    identity_key_thumbprint: 'thumbprint',
    status,
    manifest_id: manifestId,
    created_at: now,
    updated_at: now,
  });
  await knex('app_installation_manifests').insert({
    id: manifestId,
    installation_id: id,
    manifest_url: manifestUrl,
    manifest: JSON.stringify({
      id: appId,
      name: 'Example',
      description: 'An example app.',
      author: { name: 'Example', url: 'https://example.com' },
      accent_color: '#ff5500',
      icon: { name: 'audio-lines' },
      surfaces: [{ type: 'admin_page', url: 'https://app.example.com/admin' }],
      scopes,
      identity_key: keys.identity.publicJwk,
      backend_key: keys.backend.publicJwk,
      development: false,
      manifest_url: manifestUrl,
    }),
    digest: 'digest',
    backend_key_thumbprint: 'thumbprint',
    icon_data_url: null,
    source: 'install',
    requires_approval: false,
    changes: '[]',
    created_at: now,
  });
  return id;
}

/**
 * A new verified staff session for a user, as signing in and verifying the device leaves one,
 * with the cookies that sign a browser into it. Made directly, as signing in over HTTP is rate
 * limited. Only under `auth:engine: better-auth`.
 */
export async function createTestStaffSession(
  knex: Knex,
  userId: string,
): Promise<{ id: string; setCookies: string[] }> {
  const { SESSION_COOKIE_NAME } = require('../../core/server/auth/better-auth/create-auth');
  const setCookies: string[] =
    await require('../../core/server/auth').staffSessions.createVerifiedSession(userId);
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const cookie = setCookies
    .map((each) => each.split(';')[0])
    .find((each) => each.startsWith(prefix));
  if (!cookie) {
    throw new Error('No session cookie was set for the staff session.');
  }
  const token = decodeURIComponent(cookie.slice(prefix.length)).split('.')[0];
  const session = await knex('user_sessions').where({ token }).first();
  if (!session) {
    throw new Error('The staff session was not stored.');
  }
  return { id: session.id as string, setCookies };
}

/**
 * A user token for an installation, as starting an app session issues one, acting for `userId`
 * in a new staff session of theirs. The installation's OAuth client is given `clientScopes`,
 * and the token `tokenScopes`, or the client's. Only under `auth:engine: better-auth`.
 */
export async function issueTestAppToken(
  knex: Knex,
  {
    installationId,
    userId,
    clientScopes,
    tokenScopes = clientScopes,
  }: { installationId: string; userId: string; clientScopes: string[]; tokenScopes?: string[] },
): Promise<{ token: string; session: { id: string; setCookies: string[] } }> {
  const { appTokens } = require('../../core/server/auth');
  const session = await createTestStaffSession(knex, userId);
  await appTokens.reconcileClient({ id: installationId, active: true, scopes: clientScopes });
  const issued = await appTokens.issue({
    installationId,
    userId,
    sessionId: session.id,
    scopes: tokenScopes,
  });
  if (!('accessToken' in issued)) {
    throw new Error(`No app token was issued: ${JSON.stringify(issued)}`);
  }
  return { token: issued.accessToken as string, session };
}
