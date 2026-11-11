import type { FieldType } from '@tryghost/metafield-types';
import { CHECKOUT_PORT, type CheckoutPort } from './field-ports.ts';

/**
 * What a port supplies, and what to call a field made to hold it. The type is a rule about
 * any destination: a port that returns an address can only be collected into a field that
 * keeps one. The name is used only when the request names a key the site does not keep
 * yet, which is the one moment a publisher has not chosen a label themselves.
 *
 * A key is not a port. `checkout.phone` is what a checkout collects; where it lands is whatever
 * the request said, and `Shipping Phone` is only how that field is listed.
 */
export const PORT_FIELD = {
  [CHECKOUT_PORT.shippingName]: { key: 'shipping_name', name: 'Shipping Name', type: 'short_text' },
  [CHECKOUT_PORT.shippingAddress]: {
    key: 'shipping_address',
    name: 'Shipping Address',
    type: 'address',
  },
  [CHECKOUT_PORT.phone]: { key: 'shipping_phone', name: 'Shipping Phone', type: 'short_text' },
} as const satisfies Record<CheckoutPort, { key: string; name: string; type: FieldType }>;
