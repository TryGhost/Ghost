// What PKCS#8 puts before an Ed25519 private key's 32 bytes (RFC 8410).
const ED25519_PKCS8 = [48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32];

/** The public half (`x`) of an Ed25519 private key's bytes (`d`), so a JWK's own `x` can be checked. */
export async function publicHalfOf(d: Uint8Array): Promise<string | undefined> {
  const pkcs8 = Uint8Array.of(...ED25519_PKCS8, ...d);
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, true, ['sign']);
  return (await crypto.subtle.exportKey('jwk', key)).x;
}
