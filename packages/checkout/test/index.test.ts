import { describe, it, assert } from 'vitest';
import {
  PORT_FIELD,
  STRIPE_ALLOWED_COUNTRIES,
  STRIPE_CHECKOUT_BORDER_STYLES,
  STRIPE_CHECKOUT_FONTS,
  STRIPE_PORT,
  STRIPE_PORTS,
  isStripeAllowedCountry,
  isStripePort,
} from '../src/index.ts';

describe('allowed countries', function () {
  it('accepts a country Stripe ships to', function () {
    assert.ok(isStripeAllowedCountry('GB'));
    // Absent from a general ISO country list, accepted by Stripe.
    assert.ok(isStripeAllowedCountry('XK'));
    assert.ok(isStripeAllowedCountry('ZZ'));
    // Omitted by the pinned SDK's own union, accepted by the live API.
    assert.ok(isStripeAllowedCountry('SD'));
  });

  it('refuses one it does not', function () {
    // The usual slip for GB. Two letters, looks like a country, and Stripe refuses it.
    assert.equal(isStripeAllowedCountry('UK'), false);
    // Sanctioned, so present in a general country list and refused by Stripe.
    assert.equal(isStripeAllowedCountry('KP'), false);
    assert.equal(isStripeAllowedCountry('IR'), false);
  });

  it('carries no duplicates', function () {
    assert.equal(new Set(STRIPE_ALLOWED_COUNTRIES).size, STRIPE_ALLOWED_COUNTRIES.length);
  });
});

describe('ports', function () {
  it('recognises the names Stripe returns values under', function () {
    for (const port of STRIPE_PORTS) {
      assert.ok(isStripePort(port));
    }
    assert.equal(isStripePort('email'), false);
  });

  it('names a field for every port, of a type that can hold what it returns', function () {
    // Stripe returns a structured address for the address, plain text for the rest, so a
    // port left out here would be collected into whatever a request happened to name.
    assert.deepEqual(Object.keys(PORT_FIELD).sort(), [...STRIPE_PORTS].sort());
    assert.equal(PORT_FIELD[STRIPE_PORT.shippingAddress].type, 'address');
    assert.equal(PORT_FIELD[STRIPE_PORT.shippingName].type, 'short_text');
    assert.equal(PORT_FIELD[STRIPE_PORT.phone].type, 'short_text');
  });
});

describe('branding', function () {
  it('carries no duplicates', function () {
    assert.equal(new Set(STRIPE_CHECKOUT_FONTS).size, STRIPE_CHECKOUT_FONTS.length);
    assert.equal(new Set(STRIPE_CHECKOUT_BORDER_STYLES).size, STRIPE_CHECKOUT_BORDER_STYLES.length);
  });
});
