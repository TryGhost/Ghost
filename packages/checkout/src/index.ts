/**
 * What Ghost's Stripe Checkout can collect, where it lands, and how the page can be styled.
 *
 * Shared because three parties have to agree on it and cannot import each other's source:
 * Ghost Core builds the session and validates what a publisher saves, Admin offers the
 * publisher only what the save would accept, and a divergence between them is a setting
 * that looks saved and collects nothing.
 *
 * Every value here except the branding values was measured against the live Stripe API at
 * Ghost's pinned version by `e2e/scripts/probe-stripe-constraints.ts`, not read from the
 * docs or the SDK — both have disagreed with the API. Re-measure before changing one.
 */

export { STRIPE_ALLOWED_COUNTRIES, isStripeAllowedCountry } from './allowed-countries.ts';
export type { StripeAllowedCountry } from './allowed-countries.ts';

export { STRIPE_PORT, STRIPE_PORTS, isStripePort } from './field-ports.ts';
export type { StripePort } from './field-ports.ts';

export { PORT_FIELD } from './destinations.ts';

export { STRIPE_CHECKOUT_BORDER_STYLES, STRIPE_CHECKOUT_FONTS } from './branding.ts';
export type { StripeCheckoutBorderStyle, StripeCheckoutFont } from './branding.ts';
