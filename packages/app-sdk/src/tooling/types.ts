import type { PublicKeyJwk } from './keys.ts';

export type { SignedManifest } from '@tryghost/app-contracts/identity';
export type { ManifestError } from '@tryghost/app-contracts/manifest';

// ManifestSource and AppManifest are written out, as the contracts infer theirs from zod, so
// the declarations an app installs need nothing but these.

/**
 * What `ghost-app.json` holds: the manifest, without the fields the tooling adds when it
 * signs. See the SDK's README for each field's rules.
 */
export interface ManifestSource {
  id: string;
  name: string;
  description: string;
  author: { name: string; url: string };
  accent_color: string;
  icon: { name: string } | { url: string };
  surfaces: { type: 'admin_page'; url: string }[];
}

/** A manifest as Ghost reads it from a signed manifest, with every path resolved. */
export interface AppManifest extends ManifestSource {
  manifest_url: string;
  identity_key: PublicKeyJwk;
  backend_key: PublicKeyJwk;
  development: boolean;
}
