import type { AppAccess, AppAccessSource } from '@tryghost/app-contracts';
import type { PublicKeyJwk } from './keys.ts';

export type { SignedManifest } from '@tryghost/app-contracts/identity';
export type { ManifestError } from '@tryghost/app-contracts/manifest';

// ManifestSource and AppManifest are written out, as the contracts infer theirs from zod, so
// the declarations an app installs need nothing but these. Access is typed from the scope
// registry, which is plain types, so only the registry's names type-check.

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
  /**
   * The scopes the app needs, grouped by resource, such as
   * `{"post": {"scopes": [{"permission_key": "post:read", "backend": true}]}}`. `backend` marks a scope
   * the app's backend may use on its own, with nobody present. `{}` asks for nothing.
   */
  access: AppAccessSource;
}

/** A manifest as Ghost reads it from a signed manifest, with every path resolved. */
export interface AppManifest extends Omit<ManifestSource, 'access'> {
  /** As in the source, with `backend` always set. */
  access: AppAccess;
  manifest_url: string;
  identity_key: PublicKeyJwk;
  backend_key: PublicKeyJwk;
  development: boolean;
}
