// The identity contract's types, written out rather than inferred from its schemas, in a module
// that loads nothing, so the app SDK's declarations can hold them without zod or jose. Type
// tests hold the schemas to them.

/** A signed manifest as an app serves it: flattened JWS JSON (RFC 7515, section 7.2.2). */
export interface SignedManifest {
  protected: string;
  payload: string;
  signature: string;
}

/**
 * A private Ed25519 key as a JWK (RFC 8037): what an app's developer signs its manifest with,
 * and its backend answers challenges with.
 */
export type PrivateKeyJwk = { kty: 'OKP'; crv: 'Ed25519'; x: string; d: string };
