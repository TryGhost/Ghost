import { describe, expect, it } from 'vitest';

import { BACKEND_KEY, IDENTITY_KEY, errorsOf, manifest, manifestOf } from './helpers.ts';

describe('identity_key and backend_key', () => {
  it('are public Ed25519 keys as JWKs', () => {
    const parsed = manifestOf(manifest());
    expect(parsed.identity_key).toEqual(IDENTITY_KEY);
    expect(parsed.backend_key).toEqual(BACKEND_KEY);
  });

  it.each(['identity_key', 'backend_key'])('%s is required', (field) => {
    expect(errorsOf(manifest({ [field]: undefined }))).toEqual([
      { path: field, message: 'Expected a public Ed25519 key as a JWK with kty, crv and x' },
    ]);
  });

  // A manifest is public, so a private key in it has leaked and must be replaced.
  it.each(['identity_key', 'backend_key'])('%s refuses a key with its private part', (field) => {
    const withPrivatePart = { ...IDENTITY_KEY, d: 'nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A' };
    expect(errorsOf(manifest({ [field]: withPrivatePart }))).toEqual([
      {
        path: field,
        message: 'Expected a public key, but this includes its private part (d)',
      },
    ]);
  });

  it('names the private part over any other member', () => {
    const key = { ...IDENTITY_KEY, kid: 'main', d: 'nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A' };
    expect(errorsOf(manifest({ identity_key: key }))).toEqual([
      {
        path: 'identity_key',
        message: 'Expected a public key, but this includes its private part (d)',
      },
    ]);
  });

  it('refuses keys of another type or curve', () => {
    for (const key of [
      { ...IDENTITY_KEY, kty: 'EC' },
      { ...IDENTITY_KEY, crv: 'X25519' },
      { kty: 'RSA', n: 'abc', e: 'AQAB' },
      'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s',
    ]) {
      const errors = errorsOf(manifest({ identity_key: key }));
      expect(errors.length).toBeGreaterThan(0);
      for (const { path } of errors) {
        expect(path).toMatch(/^identity_key/);
      }
    }
  });

  it('refuses members a public key doesn’t need, naming them', () => {
    const key = { ...IDENTITY_KEY, kid: 'main', alg: 'EdDSA' };
    expect(errorsOf(manifest({ identity_key: key }))).toEqual([
      { path: 'identity_key', message: 'Expected only kty, crv and x; remove kid, alg' },
    ]);
  });

  // Each key has one spelling, so comparing x compares keys.
  it('refuses an x that isn’t 32 bytes in canonical base64url', () => {
    for (const x of [
      'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s=',
      'xQcVt/FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il+5sX/s',
      'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_t',
      'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX',
    ]) {
      expect(errorsOf(manifest({ identity_key: { ...IDENTITY_KEY, x } }))).toEqual([
        { path: 'identity_key.x', message: 'Expected 32 bytes in base64url, without padding' },
      ]);
    }
  });

  // The backend key is online. If it could also sign manifests, taking over the backend
  // would be enough to publish any manifest as the app.
  it('refuses the same key for both', () => {
    expect(errorsOf(manifest({ backend_key: IDENTITY_KEY }))).toEqual([
      { path: 'backend_key', message: 'Expected a different key from identity_key' },
    ]);
  });

  it('only compares the keys once both are keys', () => {
    expect(
      errorsOf(manifest({ backend_key: undefined, name: '' })).map(({ path }) => path),
    ).toEqual(['name', 'backend_key']);
    expect(
      errorsOf(manifest({ backend_key: IDENTITY_KEY, name: '' })).map(({ path }) => path),
    ).toEqual(['name', 'backend_key']);
  });
});
