/** A public Ed25519 key as a JWK (RFC 8037), with nothing but the members it needs. */
export type PublicKeyJwk = { kty: 'OKP'; crv: 'Ed25519'; x: string };
