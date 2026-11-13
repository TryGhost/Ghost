import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { COUNTRY_CODES } from '../src/countries.ts';

// Widened from the literal union so arbitrary strings can be looked up.
const codes: readonly string[] = COUNTRY_CODES;

describe('metafield-types countries', function () {
  it('lists every country an address may name, once each', function () {
    assert.equal(new Set(codes).size, codes.length);
    assert.ok(codes.every((code) => /^[A-Z]{2}$/.test(code)));
    // ISO 3166-1, plus Kosovo and the two exceptionally reserved codes real addresses use.
    for (const code of ['DE', 'XK', 'AC', 'TA']) {
      assert.ok(codes.includes(code), `${code} is missing`);
    }
    // Stripe's "unknown region" is not a place, so it is never offered.
    assert.ok(!codes.includes('ZZ'));
  });
});
