import { z } from 'zod';
import { CHECKOUT_PORT, CHECKOUT_PORTS, type CheckoutPort } from '@tryghost/checkout';
import { partsOf } from '@tryghost/metafield-types';

const Collected = z
  .string()
  .nullish()
  .transform((given) => (given && given.trim() !== '' ? given : undefined));

const ShippingDetails = z
  .object({
    name: Collected,
    address: z.record(z.string(), Collected).nullish(),
  })
  .nullish()
  .catch(null);

/**
 * What a completed session asked for and what came back.
 *
 * Where the shipping details are depends on the API version the event was rendered at:
 * `shipping` at Ghost's pinned version, `shipping_details` from 2022-08-01, and
 * `collected_information.shipping_details` from 2025-03-31. Webhooks Ghost registers use the
 * pinned version, while a local `stripe listen` forwards events at the account's own version,
 * so all three are read.
 *
 * Each part is read on its own: one in a shape Ghost doesn't expect reads as missing, rather
 * than costing the answers the others carry.
 */
const CompletedSession = z
  .object({
    shipping_address_collection: z.object({}).loose().nullish().catch(null),
    phone_number_collection: z.object({ enabled: z.boolean() }).nullish().catch(null),
    shipping: ShippingDetails,
    shipping_details: ShippingDetails,
    collected_information: z.object({ shipping_details: ShippingDetails }).nullish().catch(null),
    customer_details: z.object({ phone: Collected }).nullish().catch(null),
  })
  .loose();
type CompletedSession = z.output<typeof CompletedSession>;

const ADDRESS_PARTS = partsOf('address') ?? [];

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

/** The shipping details, if the checkout asked for an address. */
function shippingAsked(session: CompletedSession) {
  return session.shipping_address_collection
    ? (session.shipping ??
        session.shipping_details ??
        session.collected_information?.shipping_details)
    : undefined;
}

/**
 * What a completed checkout gave back for each port, or nothing when it didn't ask. Stripe
 * returns the recipient's name beside the shipping address rather than as part of it, so it is
 * saved separately.
 */
const ANSWERS: { [Port in CheckoutPort]: (session: CompletedSession) => unknown } = {
  [CHECKOUT_PORT.shippingAddress]: (session) => addressValue(shippingAsked(session)?.address),
  [CHECKOUT_PORT.shippingName]: (session) => shippingAsked(session)?.name,
  [CHECKOUT_PORT.phone]: (session) =>
    session.phone_number_collection?.enabled ? session.customer_details?.phone : undefined,
};

export interface CollectedByPort {
  port: CheckoutPort;
  value: unknown;
}

/**
 * What a completed checkout asked the buyer for and got back, each under the port it is saved
 * through. Only what the checkout asked for counts: Stripe can return what it wasn't asked
 * for, such as an address saved with Link, and that isn't the publisher's to keep. What was
 * asked is read from the checkout itself, because the config can change while it is open.
 */
export const collectedAnswers = CompletedSession.transform((session): CollectedByPort[] =>
  CHECKOUT_PORTS.map((port) => ({ port, value: ANSWERS[port](session) })).filter(
    (entry) => entry.value !== undefined,
  ),
);
