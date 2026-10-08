import { z } from 'zod';
import { STRIPE_PORT } from '@tryghost/checkout';
import { subFieldsOf } from '@tryghost/metafield-types';

const Collected = z
  .string()
  .nullish()
  .transform((given) => (given && given.trim() !== '' ? given : undefined));

const ShippingDetails = z
  .object({
    name: Collected,
    address: z.record(z.string(), Collected).nullish(),
  })
  .nullish();

/**
 * The shipping details on a completed session. Where they are depends on the API version the
 * event was rendered at: `shipping` at Ghost's pinned version, `shipping_details` from
 * 2022-08-01, and `collected_information.shipping_details` from 2025-03-31. Webhooks Ghost
 * registers use the pinned version, while a local `stripe listen` forwards events at the
 * account's own version, so all three are read.
 */
const CompletedSession = z
  .object({
    shipping: ShippingDetails,
    shipping_details: ShippingDetails,
    collected_information: z.object({ shipping_details: ShippingDetails }).nullish(),
  })
  .loose();

const ADDRESS_PARTS = subFieldsOf('address') ?? [];

/**
 * The address as a value for an address custom field, or nothing when Stripe gave no part of
 * one. A write only changes the parts it names, so every part is named, and an empty one
 * clears whatever an earlier address left there.
 */
function addressValue(
  address: Record<string, string | undefined> | null | undefined,
): Record<string, string> | undefined {
  const given = address ?? {};
  if (!ADDRESS_PARTS.some((part) => given[part] !== undefined)) {
    return undefined;
  }
  return Object.fromEntries(ADDRESS_PARTS.map((part) => [part, given[part] ?? '']));
}

export interface CollectedByPort {
  port: string;
  value: unknown;
}

/**
 * The shipping address and recipient's name a completed checkout gives back, each under the
 * port it is saved through. Stripe returns the name beside the address rather than as part of
 * it, so it is saved separately.
 */
export const collectedShipping = CompletedSession.transform((session): CollectedByPort[] => {
  const details =
    session.shipping ?? session.shipping_details ?? session.collected_information?.shipping_details;
  return [
    { port: STRIPE_PORT.shippingAddress, value: addressValue(details?.address) },
    { port: STRIPE_PORT.shippingName, value: details?.name },
  ].filter((entry) => entry.value !== undefined);
});
