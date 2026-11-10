import { calculateJwkThumbprint } from 'jose';
import { describe, expect, it } from 'vitest';

import { thumbprintOf } from '../../src/identity/index.ts';
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
