import { describe, expect, it } from 'vitest';

import type {
  TierCheckoutConfig,
  TierCheckoutConfigInput,
} from '../../../src/api/tiers-checkout-config';

// Compile-time cases: the build failing is the assertion. Each `@ts-expect-error` fails
// the build if the case it names stops being an error, so a drift between these types and
// the server's serializers (tier-checkout-config/serializers.ts) surfaces as a build
// break instead of a runtime 422. Directives sit immediately above the value they judge.

const everythingOff: TierCheckoutConfigInput = {
  shipping: { collect: false },
  tax_number: { collect: false },
  phone: { collect: false },
};

const everythingOn: TierCheckoutConfigInput = {
  shipping: {
    collect: true,
    allowed_countries: ['US'],
    name: { custom_field_key: 'recipient_name' },
    address: { custom_field_key: 'shipping_address' },
  },
  tax_number: { collect: true },
  phone: { collect: true, custom_field_key: 'phone' },
};

// The tax number stays on Stripe, against the member's invoices: a destination is not
// part of its contract, and the server's strict schema refuses one.
const taxWithDestination: TierCheckoutConfigInput = {
  // @ts-expect-error tax_number takes no custom_field_key
  tax_number: { collect: true, custom_field_key: 'vat' },
};

// Shipping that collects must state everything it needs; the checkout asks for the name
// and address together and both land in required destinations.
const shippingWithoutName: TierCheckoutConfigInput = {
  // @ts-expect-error a collecting shipping block must name where the recipient name goes
  shipping: {
    collect: true,
    allowed_countries: ['US'],
    address: { custom_field_key: 'shipping_address' },
  },
};

const shippingWithoutAddress: TierCheckoutConfigInput = {
  // @ts-expect-error a collecting shipping block must name where the address goes
  shipping: {
    collect: true,
    allowed_countries: ['US'],
    name: { custom_field_key: 'recipient_name' },
  },
};

const shippingWithoutCountries: TierCheckoutConfigInput = {
  // @ts-expect-error a collecting shipping block must state its allowed countries
  shipping: {
    collect: true,
    name: { custom_field_key: 'recipient_name' },
    address: { custom_field_key: 'shipping_address' },
  },
};

const phoneWithoutDestination: TierCheckoutConfigInput = {
  // @ts-expect-error a collecting phone block must name its destination
  phone: { collect: true },
};

// A response block is present only when the tier collects that thing, and a present
// block carries its destinations as definite strings, never null.
const response: TierCheckoutConfig = {
  tier_id: 'abc',
  custom_fields: [{ key: 'company', label: null, optional: true }],
  shipping: {
    collect: true,
    allowed_countries: ['US'],
    name: { custom_field_key: 'recipient_name' },
    address: { custom_field_key: 'shipping_address' },
  },
  tax_number: { collect: true },
  phone: { collect: true, custom_field_key: 'phone' },
};

const responseWithNullDestination: TierCheckoutConfig = {
  tier_id: 'abc',
  custom_fields: [],
  shipping: {
    collect: true,
    allowed_countries: ['US'],
    // @ts-expect-error a served shipping block always names both destinations
    name: { custom_field_key: null },
    address: { custom_field_key: 'shipping_address' },
  },
};

describe('tiers-checkout-config wire contract', () => {
  it('compiles the shapes the server accepts and serves', () => {
    // The `@ts-expect-error` cases above are the real assertions; this keeps the
    // compile-time values referenced and the file a test.
    for (const value of [
      everythingOff,
      everythingOn,
      taxWithDestination,
      shippingWithoutName,
      shippingWithoutAddress,
      shippingWithoutCountries,
      phoneWithoutDestination,
      response,
      responseWithNullDestination,
    ]) {
      expect(value).toBeTruthy();
    }
  });
});
