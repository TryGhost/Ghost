import { z } from 'zod';
import { STRIPE_PORTS, type StripePort } from './field-ports';

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
    Object.entries(address ?? {}).filter(([, given]) => given !== undefined),
  ) as Record<string, string>;
  return Object.keys(value).length > 0 ? value : undefined;
}

const PORT_VALUES: Record<StripePort, (session: z.output<typeof CompletedSession>) => unknown> = {
  // Beside the address on Stripe's side, inside it on ours, so it travels its own port.
  shipping_name: (session) => session.shipping?.name,
  shipping_address: (session) => addressValue(session.shipping?.address),
  phone: (session) => session.customer_details?.phone,
};

/**
 * Answers and collected values alike come out as a port and a value, because both are
 * routed the same way afterwards. Collected values come last: where two land in one
 * field, the later write is what the field holds.
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
