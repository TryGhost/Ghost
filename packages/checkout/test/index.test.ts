import { describe, it, assert } from 'vitest';
import {
  PORT_FIELD,
  STRIPE_ALLOWED_COUNTRIES,
  STRIPE_CHECKOUT_BORDER_STYLES,
  STRIPE_CHECKOUT_FONTS,
  CHECKOUT_PORT,
  CHECKOUT_PORTS,
  isStripeAllowedCountry,
  isCheckoutPort,
  isRequirementName,
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
  it('recognises the names a checkout collects values under', function () {
    for (const port of CHECKOUT_PORTS) {
      assert.ok(isCheckoutPort(port));
    }
    assert.equal(isCheckoutPort('email'), false);
    // A requirement's name is never a port: only its answers are collected.
    assert.equal(isCheckoutPort('shipping'), false);
  });

  it('names a field for every port, of a type that can hold what it returns', function () {
    // Stripe returns a structured address for the address, plain text for the rest, so a
    // port left out here would be collected into whatever a request happened to name.
    assert.deepEqual(Object.keys(PORT_FIELD).sort(), [...CHECKOUT_PORTS].sort());
    assert.equal(PORT_FIELD[CHECKOUT_PORT.shippingAddress].type, 'address');
    assert.equal(PORT_FIELD[CHECKOUT_PORT.shippingName].type, 'short_text');
    assert.equal(PORT_FIELD[CHECKOUT_PORT.phone].type, 'short_text');
  });

  it('gives each port to one requirement', function () {
    // A port under two requirements would be asked for twice, and land in one field for both.
    assert.equal(new Set(CHECKOUT_PORTS).size, CHECKOUT_PORTS.length);
  });

  it('names no port as another port with a part after it', function () {
    // A refused part of an answer is named `<port>.<part>`, which mustn't read as another port.
    for (const port of CHECKOUT_PORTS) {
      assert.equal(
        CHECKOUT_PORTS.some((other) => other.startsWith(`${port}.`)),
        false,
        port,
      );
    }
  });

  it('recognises what a tier can require', function () {
    assert.ok(isRequirementName('shipping'));
    assert.ok(isRequirementName('phone'));
    assert.equal(isRequirementName('tax_number'), false);
    assert.equal(isRequirementName(CHECKOUT_PORT.phone), false);
    assert.equal(isRequirementName('toString'), false);
  });
});

describe('branding', function () {
  it('carries no duplicates', function () {
    assert.equal(new Set(STRIPE_CHECKOUT_FONTS).size, STRIPE_CHECKOUT_FONTS.length);
    assert.equal(new Set(STRIPE_CHECKOUT_BORDER_STYLES).size, STRIPE_CHECKOUT_BORDER_STYLES.length);
  });
});
