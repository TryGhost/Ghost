/** The names Stripe returns values under, and the only ports a binding for it may use. */
export const STRIPE_PORTS = ['shipping_name', 'shipping_address', 'phone'] as const;
export type StripePort = (typeof STRIPE_PORTS)[number];

export function isStripePort(key: string): key is StripePort {
  return (STRIPE_PORTS as readonly string[]).includes(key);
}

export const STRIPE_PORT = {
  shippingName: 'shipping_name',
  shippingAddress: 'shipping_address',
  phone: 'phone',
} as const satisfies Record<string, StripePort>;
