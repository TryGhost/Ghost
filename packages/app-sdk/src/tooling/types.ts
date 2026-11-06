import type { AppManifest } from '@tryghost/app-contracts/manifest';

// The contracts' own types, which the SDK's declarations hold as they are, so they need nothing
// from the contracts or zod.

export type { SignedManifest } from '@tryghost/app-contracts/identity';
export type { AppManifest, ManifestError } from '@tryghost/app-contracts/manifest';

/**
 * What `ghost-app.json` holds: the manifest, without the fields the tooling adds when it
 * signs. See the SDK's README for each field's rules.
 */
export type ManifestSource = Omit<
  AppManifest,
  'manifest_url' | 'identity_key' | 'backend_key' | 'development'
>;
