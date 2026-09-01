import type { FieldType } from '@tryghost/custom-field-types';
import type { StripePort } from '../stripe/services/checkout/field-ports';

/**
 * What a port supplies, and what to call a field made to hold it. The type is a rule about
 * any destination: a port that returns an address can only be collected into a field that
 * keeps one. The name is used only when the request names a key the site does not keep
 * yet, which is the one moment a publisher has not chosen a label themselves.
 *
 * A key is not a port. `phone` is what Stripe calls what it returns; where it lands is
 * whatever the request said, and `Shipping Phone` is only how that field is listed.
 */
export const PORT_FIELD = {
  shipping_name: { name: 'Shipping Name', type: 'short_text' },
  shipping_address: { name: 'Shipping Address', type: 'address' },
  phone: { name: 'Shipping Phone', type: 'short_text' },
} as const satisfies Record<StripePort, { name: string; type: FieldType }>;
