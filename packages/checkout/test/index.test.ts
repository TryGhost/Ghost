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
  isAskable,
  isRequiredPort,
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
    // Shipping is bound in its parts, never whole.
    assert.equal(isCheckoutPort(CHECKOUT_PORT.shipping), false);
  });

  it('names a field for every port, of a type that can hold what it returns', function () {
    // Stripe returns a structured address for the address, plain text for the rest, so a
    // port left out here would be collected into whatever a request happened to name.
    assert.deepEqual(Object.keys(PORT_FIELD).sort(), [...CHECKOUT_PORTS].sort());
    assert.equal(PORT_FIELD[CHECKOUT_PORT.shippingAddress].type, 'address');
    assert.equal(PORT_FIELD[CHECKOUT_PORT.shippingName].type, 'short_text');
    assert.equal(PORT_FIELD[CHECKOUT_PORT.phone].type, 'short_text');
  });

  it('gives each part to one port a tier can require', function () {
    // A part under two ports would be asked for twice, and land in one field for both.
    assert.equal(new Set(CHECKOUT_PORTS).size, CHECKOUT_PORTS.length);
  });

  it('recognises the ports a tier can require', function () {
    assert.ok(isRequiredPort(CHECKOUT_PORT.shipping));
    assert.ok(isRequiredPort(CHECKOUT_PORT.phone));
    assert.equal(isRequiredPort(CHECKOUT_PORT.shippingAddress), false);
    assert.equal(isRequiredPort('toString'), false);
  });

  it('asks for a port while each part is kept somewhere and each essential part can take a value', function () {
    const keptIn =
      (fields: Partial<Record<string, boolean>>) =>
      (part: string): { ready: boolean } | undefined =>
        fields[part] === undefined ? undefined : { ready: fields[part] };
    const { shipping, shippingAddress, shippingName, phone } = CHECKOUT_PORT;

    assert.ok(isAskable(shipping, keptIn({ [shippingAddress]: true, [shippingName]: true })));
    // Without the recipient's name, the address is still kept.
    assert.ok(isAskable(shipping, keptIn({ [shippingAddress]: true, [shippingName]: false })));
    assert.equal(
      isAskable(shipping, keptIn({ [shippingAddress]: false, [shippingName]: true })),
      false,
    );
    assert.equal(isAskable(shipping, keptIn({ [shippingAddress]: true })), false);
    assert.equal(isAskable(phone, keptIn({ [phone]: false })), false);
  });
});

describe('branding', function () {
  it('carries no duplicates', function () {
    assert.equal(new Set(STRIPE_CHECKOUT_FONTS).size, STRIPE_CHECKOUT_FONTS.length);
    assert.equal(new Set(STRIPE_CHECKOUT_BORDER_STYLES).size, STRIPE_CHECKOUT_BORDER_STYLES.length);
  });
});
