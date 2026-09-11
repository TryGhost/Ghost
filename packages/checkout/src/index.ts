/**
 * What Ghost's Stripe Checkout can collect, and where it lands.
 *
 * Shared because three parties have to agree on it and cannot import each other's source:
 * Ghost Core builds the session and validates what a publisher saves, Admin offers the
 * publisher only what the save would accept, and a divergence between them is a setting
 * that looks saved and collects nothing.
 *
 * Every value here was measured against the live Stripe API at Ghost's pinned version by
 * `e2e/scripts/probe-stripe-constraints.ts`, not read from the docs or the SDK — both have
 * disagreed with the API. Re-measure before changing one.
 */

export { STRIPE_ALLOWED_COUNTRIES, isStripeAllowedCountry } from './allowed-countries.ts';
export type { StripeAllowedCountry } from './allowed-countries.ts';

export {
  CHECKOUT_ELIGIBLE_FIELD_TYPES,
  MAX_CHECKOUT_CUSTOM_FIELDS,
  MAX_CHECKOUT_LABEL_LENGTH,
  STRIPE_PORT,
  STRIPE_PORTS,
  isCheckoutEligible,
  isStripePort,
} from './field-ports.ts';
export type { CheckoutEligibleFieldType, StripePort } from './field-ports.ts';

export { PORT_FIELD } from './destinations.ts';
