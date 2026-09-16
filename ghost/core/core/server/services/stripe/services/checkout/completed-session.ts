import { z } from 'zod';
import { STRIPE_PORTS, type StripePort } from '@tryghost/checkout';

/**
 * What Ghost reads off a completed session.
 *
 * `shipping` is where the address lives at Ghost's pinned Stripe API version; later
 * versions moved it to `collected_information.shipping_details`. An Event is an immutable
 * snapshot rendered at the account's version, so nothing in a payload would warn us if
 * that pin ever changed.
 *
 * A tax number is deliberately not read: Stripe keeps it against the customer it invoices
 * and Ghost never stores one.
 */

const Collected = z
  .string()
  .nullish()
  .transform((given) => (given && given.trim() !== '' ? given : undefined));

export const CompletedSession = z
  .object({
    custom_fields: z
      .array(
        z
          .object({
            key: z.string().nullish(),
            text: z.object({ value: Collected }).nullish(),
          })
          .nullable(),
      )
      .nullish(),
    shipping: z
      .object({
        name: Collected,
        address: z.record(z.string(), Collected).nullish(),
      })
      .nullish(),
    customer_details: z.object({ phone: Collected }).nullish(),
  })
  .loose();
export type CompletedSession = z.input<typeof CompletedSession>;

export interface CollectedByPort {
  port: string;
  value: unknown;
}

/** Our address type needs at least one part; an empty value would erase what is there. */
function addressValue(
  address: Record<string, string | undefined> | null | undefined,
): Record<string, string> | undefined {
  const value = Object.fromEntries(
    Object.entries(address ?? {}).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  return Object.keys(value).length > 0 ? value : undefined;
}

const PORT_VALUES: Record<StripePort, (session: z.output<typeof CompletedSession>) => unknown> = {
  // Stripe returns the recipient's name alongside the address rather than as part of it,
  // while Ghost keeps a name and an address in two separate custom fields. So the name is
  // carried back separately here, under its own name, to be routed to its own field.
  shipping_name: (session) => session.shipping?.name,
  shipping_address: (session) => addressValue(session.shipping?.address),
  phone: (session) => session.customer_details?.phone,
};

/**
 * Everything a completed checkout gives back, as a list of pairs: the name Stripe used for
 * a value, and the value itself. Answers to questions and values Stripe collected on its
 * own both come back this way, because both are saved by the same route afterwards.
 *
 * Order matters. The values Stripe collected come last, so that if a question's answer and
 * a collected value are both saved into the same custom field, the collected value is the
 * one the field ends up holding.
 */
export const collectedByPort = CompletedSession.transform((session): CollectedByPort[] => {
  const answers: CollectedByPort[] = (session.custom_fields ?? [])
    .filter((field) => Boolean(field?.key && field.text?.value))
    .map((field) => ({ port: field!.key!, value: field!.text!.value }));

  const ports = STRIPE_PORTS.map((port) => ({ port, value: PORT_VALUES[port](session) })).filter(
    (entry) => entry.value !== undefined,
  );

  return [...answers, ...ports];
});
