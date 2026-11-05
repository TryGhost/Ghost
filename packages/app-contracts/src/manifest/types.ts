// The manifest's types, written out rather than inferred from its schemas, in a module that
// loads nothing, so the app SDK's declarations can hold them without zod. Type tests hold the
// schemas to them, so a field added to a schema is added here too.

/** One of the icons Admin ships, by name, or an image the app serves. */
export type AppIcon = { name: string } | { url: string };

/** A public Ed25519 key as a JWK (RFC 8037), with nothing but the members it needs. */
export type PublicKeyJwk = { kty: 'OKP'; crv: 'Ed25519'; x: string };

/**
 * A parsed manifest. Every URL in it is absolute, and a surface's origin is the only one
 * allowed to talk to Ghost from that surface.
 */
export type AppManifest = {
  id: string;
  name: string;
  description: string;
  author: { name: string; url: string };
  accent_color: string;
  icon: AppIcon;
  surfaces: { type: 'admin_page'; url: string }[];
  manifest_url: string;
  identity_key: PublicKeyJwk;
  backend_key: PublicKeyJwk;
  development: boolean;
};

export type AppSurface = AppManifest['surfaces'][number];

export type AppSurfaceType = AppSurface['type'];
