import type { FieldType } from '@tryghost/metafield-types';
import type { StripePort } from './field-ports.ts';

/**
 * What a port supplies, as the custom field type that can hold it. A rule about any
 * destination: a port that returns an address can only be collected into a field that keeps
 * one.
 */
export const PORT_FIELD = {
  shipping_name: { type: 'short_text' },
  shipping_address: { type: 'address' },
  phone: { type: 'short_text' },
} as const satisfies Record<StripePort, { type: FieldType }>;
