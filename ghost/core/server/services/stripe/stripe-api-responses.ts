/**
 * Schemas for what `StripeAPI` returns, the response-side counterpart of
 * `checkout-session-params.ts`. Each declares only the fields Ghost reads from the response, as
 * loose objects, so every other field passes through as Stripe sent it.
 */
import { z } from 'zod';
import { StripeName } from './codecs';

/**
 * A subscription's default payment method: its ID, or the payment method when the request
 * expanded it, whose `billing_details.name` is the cardholder's name.
 */
const PaymentMethod = z
  .union([
    z.string(),
    z.object({ billing_details: z.object({ name: StripeName.nullish() }).loose() }).loose(),
  ])
  .nullish();

/**
 * A Stripe customer as `StripeAPI.getCustomer` returns it, with its subscriptions expanded: its
 * own name, and the cardholder name on each subscription's payment method when that's expanded
 * too, shortened to fit. A deleted customer passes through as Stripe sent it.
 */
export const StripeCustomer = z.union([
  z.object({ deleted: z.literal(true) }).loose(),
  z
    .object({
      name: StripeName.nullish(),
      subscriptions: z
        .object({ data: z.array(z.object({ default_payment_method: PaymentMethod }).loose()) })
        .loose(),
    })
    .loose(),
]);

export type StripeCustomer = z.output<typeof StripeCustomer>;
