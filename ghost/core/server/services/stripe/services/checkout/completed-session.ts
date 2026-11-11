import { z } from 'zod';
import { PORT_FIELD, CHECKOUT_PORT, CHECKOUT_PORTS, type CheckoutPort } from '@tryghost/checkout';
import { FIELD_STRUCTURES, keysOf, phoneNumberIn, type ValueOf } from '@tryghost/metafield-types';

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
    customer_details: z
      .object({
        phone: Collected,
        address: z.object({ country: Collected }).nullish().catch(null),
      })
      .nullish()
      .catch(null),
  })
  .loose();
type CompletedSession = z.output<typeof CompletedSession>;

const ADDRESS_PARTS = keysOf(FIELD_STRUCTURES.address.parts);

type AddressValue = ValueOf<'address'>;

/**
 * The address as an answer for an address custom field, or nothing when Stripe gave no part of
 * one. Only the parts Stripe gave are named: an answer replaces whatever the field held, so the
 * bindings clear the rest.
 */
function addressValue(
  address: Record<string, string | undefined> | null | undefined,
): AddressValue | undefined {
  const given = address ?? {};
  const value: { -readonly [P in keyof AddressValue]: AddressValue[P] } = {};
  for (const part of ADDRESS_PARTS) {
    const text = given[part];
    if (text !== undefined) {
      value[part] = text;
    }
  }
  return Object.keys(value).length > 0 ? value : undefined;
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
 * How the phone number a completed checkout asked for came back from Stripe, never the number
 * itself, which is the buyer's. `form` is what reading it took: `e164` as Stripe gives a number
 * typed into Checkout, `international` readable without a country as it carries its own code,
 * `national` readable only in the buyer's country, as a wallet's number without its code is, and
 * `unreadable` not even there. `country` is where the buyer's country came from: their card, where
 * the checkout ships, or nowhere.
 */
export interface CollectedPhone {
  form: 'e164' | 'international' | 'national' | 'unreadable';
  country: 'billing' | 'shipping' | 'none';
}

/** The country the buyer is in, and where it came from: their card's, or else where it ships. */
function buyerCountry(session: CompletedSession): {
  country: string | undefined;
  from: CollectedPhone['country'];
} {
  const billing = session.customer_details?.address?.country;
  if (billing) {
    return { country: billing, from: 'billing' };
  }
  const shipping = shippingAsked(session)?.address?.country;
  return shipping ? { country: shipping, from: 'shipping' } : { country: undefined, from: 'none' };
}

/** The phone number as Stripe gave it, if the checkout asked for one. */
function phoneGiven(session: CompletedSession): string | undefined {
  return session.phone_number_collection?.enabled ? session.customer_details?.phone : undefined;
}

/**
 * The phone number, if the checkout asked for one. Stripe gives a number typed into Checkout in
 * E.164, but Apple Pay and Google Pay pass one on as the wallet keeps it, which can be without its
 * country code, so a number is read in the buyer's country, as Stripe's own phone input starts
 * from it. One that doesn't read as a number there goes as given, for the phone field to refuse.
 */
function phoneAsked(session: CompletedSession): string | undefined {
  const phone = phoneGiven(session);
  return phone && (phoneNumberIn(phone, buyerCountry(session).country) ?? phone);
}

/** How the phone number came back, or undefined when the checkout didn't ask for one. */
function phoneCollected(session: CompletedSession): CollectedPhone | undefined {
  const phone = phoneGiven(session);
  if (!phone) {
    return undefined;
  }
  const { country, from } = buyerCountry(session);
  const form = /^\+[1-9]\d{1,14}$/.test(phone)
    ? 'e164'
    : phoneNumberIn(phone, undefined)
      ? 'international'
      : phoneNumberIn(phone, country)
        ? 'national'
        : 'unreadable';
  return { form, country: from };
}

/**
 * What a completed checkout gave back for each port, as a whole value for the field the port is
 * collected into, or nothing when it didn't ask. Stripe returns the recipient's name beside
 * the shipping address rather than as part of it, so it is saved separately.
 */
const ANSWERS: {
  [Port in CheckoutPort]: (
    session: CompletedSession,
  ) => ValueOf<(typeof PORT_FIELD)[Port]['type']> | undefined;
} = {
  [CHECKOUT_PORT.shippingAddress]: (session) => addressValue(shippingAsked(session)?.address),
  [CHECKOUT_PORT.shippingName]: (session) => shippingAsked(session)?.name,
  [CHECKOUT_PORT.phone]: phoneAsked,
};

export interface CollectedByPort {
  port: CheckoutPort;
  value: unknown;
}

/**
 * What a completed checkout asked the buyer for and got back, each under the port it is saved
 * through, and how its phone number came back. Only what the checkout asked for counts: Stripe
 * can return what it wasn't asked for, such as an address saved with Link, and that isn't the
 * publisher's to keep. What was asked is read from the checkout itself, because the config can
 * change while it is open.
 */
export const collectedFrom = CompletedSession.transform(
  (session): { answers: CollectedByPort[]; phone: CollectedPhone | undefined } => ({
    answers: CHECKOUT_PORTS.map((port) => ({ port, value: ANSWERS[port](session) })).filter(
      (entry) => entry.value !== undefined,
    ),
    phone: phoneCollected(session),
  }),
);
