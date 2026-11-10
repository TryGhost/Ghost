import type { PublicKeyJwk } from './keys.ts';

// Written out rather than taken from the contracts, whose manifest types are inferred from
// zod, so the declarations an app installs need nothing but these.

export type { ManifestError, SignedManifest } from '../shared/manifest.ts';

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
