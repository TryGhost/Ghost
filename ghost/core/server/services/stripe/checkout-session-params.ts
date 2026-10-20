import { STRIPE_ALLOWED_COUNTRIES } from '@tryghost/checkout';
import { snakeKeys, type SnakeKeys } from '../../lib/case-keys';
import type {
  CheckoutAsks,
  CheckoutDefinition,
  StripeCheckoutDesign,
} from '../stripe-checkout-config';

/** The Checkout session parameters that come from Ghost's checkout settings. */
export interface CheckoutSessionParams {
  branding_settings?: SnakeKeys<StripeCheckoutDesign>;
  shipping_address_collection?: { allowed_countries: string[] };
  phone_number_collection?: { enabled: true };
}

/** The Checkout session parameters that ask for each collected part a checkout asks for. */
const STRIPE_PARAMS: {
  [Section in keyof CheckoutAsks]: (asks: CheckoutAsks) => CheckoutSessionParams;
} = {
  shipping: ({ shipping }) =>
    shipping
      ? {
          shipping_address_collection: {
            // Stripe has no way to say everywhere, and a checkout without countries collects no
            // address, so everywhere is every country Stripe accepts.
            allowed_countries: shipping.allowedCountries ?? [...STRIPE_ALLOWED_COUNTRIES],
          },
        }
      : {},
  phone: ({ phone }) => (phone ? { phone_number_collection: { enabled: true } } : {}),
};

/**
 * The Checkout session parameters for a checkout: its design as `branding_settings`, and what it
 * asks the buyer for. Without a checkout there are none, so Stripe uses the merchant's own
 * settings.
 */
export function checkoutSessionParams(checkout: CheckoutDefinition | null): CheckoutSessionParams {
  if (!checkout) {
    return {};
  }
  return Object.values(STRIPE_PARAMS).reduce<CheckoutSessionParams>(
    (params, ask) => ({ ...params, ...ask(checkout.asks) }),
    checkout.design ? { branding_settings: snakeKeys(checkout.design) } : {},
  );
}
