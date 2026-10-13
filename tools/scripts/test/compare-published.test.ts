import { describe, it } from 'node:test';
import assert from 'node:assert';

import { integrityOf } from '../compare-published.ts';

describe('integrityOf', () => {
  it('produces the SRI form npm records', () => {
    const integrity = integrityOf(Buffer.from('hello'));
    assert.match(integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    assert.strictEqual(integrity, integrityOf(Buffer.from('hello')));
    assert.notStrictEqual(integrity, integrityOf(Buffer.from('hello!')));
  });

  it('matches what npm computes for a tarball', () => {
    // npm's integrity is the base64 sha512 of the exact upload bytes, so a
    // known vector pins the encoding.
    assert.strictEqual(
      integrityOf(Buffer.from('')),
      'sha512-z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg==',
    );
  });
});
