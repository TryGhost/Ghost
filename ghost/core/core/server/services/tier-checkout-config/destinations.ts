import type { FieldType } from '@tryghost/custom-field-types';
import type { StripePort } from '../stripe/services/checkout/field-ports';

/**
 * What Ghost makes to collect a port into when a publisher names nowhere. Consulted only
 * for a port nothing has bound: once one is bound, the binding says where values go.
 *
 * A key is not a port. `phone` is what Stripe calls what it returns; `shipping_phone` is
 * what the publisher's own list calls where it lands.
 */
export const PORT_DESTINATION = {
  shipping_name: { key: 'shipping_name', name: 'Shipping Name', type: 'short_text' },
  shipping_address: { key: 'shipping_address', name: 'Shipping Address', type: 'address' },
  phone: { key: 'shipping_phone', name: 'Shipping Phone', type: 'short_text' },
} as const satisfies Record<StripePort, { key: string; name: string; type: FieldType }>;
