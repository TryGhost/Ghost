import { describe, it, assert } from 'vitest';
import {
  CHECKOUT_ELIGIBLE_FIELD_TYPES,
  MAX_CHECKOUT_CUSTOM_FIELDS,
  MAX_CHECKOUT_LABEL_LENGTH,
  PORT_FIELD,
  STRIPE_ALLOWED_COUNTRIES,
  STRIPE_PORT,
  STRIPE_PORTS,
  isCheckoutEligible,
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

describe('checkout questions', function () {
  it('can be asked in a type Stripe renders', function () {
    for (const type of CHECKOUT_ELIGIBLE_FIELD_TYPES) {
      assert.ok(isCheckoutEligible(type));
    }
    // No Stripe equivalent: an address is collected through its own parameter.
    assert.equal(isCheckoutEligible('address'), false);
    // Stripe's text input caps shorter than this type allows.
    assert.equal(isCheckoutEligible('long_text'), false);
  });

  it('states the caps Stripe enforces', function () {
    assert.equal(MAX_CHECKOUT_CUSTOM_FIELDS, 3);
    assert.equal(MAX_CHECKOUT_LABEL_LENGTH, 50);
  });
});
