import { calculateJwkThumbprint } from 'jose';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import { PrivateKeyJwkSchema, thumbprintOf, type PrivateKeyJwk } from '../../src/identity/index.ts';
import { newKeyPair } from './helpers.ts';

describe('thumbprintOf', () => {
  it('is the key’s RFC 7638 SHA-256 thumbprint', async () => {
    // The example in RFC 8037, appendix A.3.
    expect(
      await thumbprintOf({
        kty: 'OKP',
        crv: 'Ed25519',
        x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
      }),
    ).toBe('kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k');
  });

  it('is the same however the JWK is written', async () => {
    const { publicJwk } = await newKeyPair();
    const reordered = { x: publicJwk.x, crv: publicJwk.crv, kty: publicJwk.kty };
    expect(await thumbprintOf(reordered)).toBe(await calculateJwkThumbprint(publicJwk));
  });
});

describe('PrivateKeyJwkSchema', () => {
  const key = { kty: 'OKP', crv: 'Ed25519', x: 'public', d: 'private' };

  it('reads a private Ed25519 key, leaving out any other member', () => {
    expect(PrivateKeyJwkSchema.parse({ ...key, kid: 'one', use: 'sig' })).toEqual(key);
  });

  it.each([
    ['another key type', { ...key, kty: 'EC' }],
    ['another curve', { ...key, crv: 'Ed448' }],
    ['no x', { ...key, x: undefined }],
    ['no d', { ...key, d: undefined }],
    ['a d that is not a string', { ...key, d: 1 }],
    ['something else', 'key'],
  ])('refuses %s', (_name, value) => {
    expect(PrivateKeyJwkSchema.safeParse(value).success).toBe(false);
  });

  it('reads a PrivateKeyJwk', () => {
    expectTypeOf<z.output<typeof PrivateKeyJwkSchema>>().toEqualTypeOf<PrivateKeyJwk>();
  });
});
