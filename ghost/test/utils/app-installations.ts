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
