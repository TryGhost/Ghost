import fs from 'fs';
import path from 'path';
import { describe, it, assert } from 'vitest';
import {
  STRIPE_ALLOWED_COUNTRIES,
  isStripeAllowedCountry,
} from '../../../../../core/server/services/stripe/services/checkout/allowed-countries';

/**
 * The list was measured against the live API rather than taken from the SDK, because the
 * SDK's `AllowedCountry` union is missing `SD`, which the live API accepts. So the two are
 * legitimately different and asserting they are equal would fail for the wrong reason.
 *
 * What does hold is that the union is a subset. Stripe adding a country shows up in the SDK
 * when the pin moves, and this fails until someone re-probes and adds it — so a country a
 * publisher could ship to cannot stay quietly unavailable.
 */
function allowedCountriesFromSdk(): string[] {
  const types = path.join(
    __dirname,
    '../../../../../node_modules/stripe/types/2020-08-27/Checkout/Sessions.d.ts',
  );
  const source = fs.readFileSync(types, 'utf8');
  const start = source.indexOf('type AllowedCountry =');
  assert.notEqual(start, -1, 'the pinned SDK no longer declares an AllowedCountry union');

  const union = source.slice(start, source.indexOf(';', start));
  return [...new Set(union.match(/'[A-Z]{2}'/g)?.map((code) => code.slice(1, -1)) ?? [])];
}

describe('Stripe allowed countries', function () {
  it('offers every country the pinned SDK knows about', function () {
    const missing = allowedCountriesFromSdk().filter((code) => !isStripeAllowedCountry(code));
    assert.deepEqual(missing, [], 'the SDK knows countries this list does not offer');
  });

  it('offers the country the SDK forgot, because the live API takes it', function () {
    assert.ok(isStripeAllowedCountry('SD'));
    assert.equal(
      allowedCountriesFromSdk().includes('SD'),
      false,
      'the SDK now lists SD, so this list no longer needs to differ from it',
    );
  });

  it('offers exactly what the end-to-end fake Stripe server will accept', function () {
    // The harness keeps its own copy on purpose: a fake that shared this list could never
    // catch Ghost offering a country Stripe refuses. Read back here because that package
    // cannot import this one, and a silent disagreement would make the fake useless.
    const harness = path.join(
      __dirname,
      '../../../../../../../e2e/helpers/services/stripe/allowed-countries.ts',
    );
    const codes = [
      ...new Set(
        fs
          .readFileSync(harness, 'utf8')
          .match(/'[A-Z]{2}',/g)
          ?.map((code) => code.slice(1, 3)) ?? [],
      ),
    ].sort();

    assert.deepEqual(codes, [...STRIPE_ALLOWED_COUNTRIES].sort());
  });

  it('accepts a country Stripe ships to and refuses one it does not', function () {
    assert.ok(isStripeAllowedCountry('GB'));
    // Kosovo and Stripe's catch-all: absent from a general ISO list, accepted by Stripe.
    assert.ok(isStripeAllowedCountry('XK'));
    assert.ok(isStripeAllowedCountry('ZZ'));
    // The usual slip for GB. Two letters, looks like a country, and Stripe refuses it.
    assert.equal(isStripeAllowedCountry('UK'), false);
    // Sanctioned, so present in a general country list and refused by Stripe.
    assert.equal(isStripeAllowedCountry('KP'), false);
    assert.equal(isStripeAllowedCountry('IR'), false);
  });
});
