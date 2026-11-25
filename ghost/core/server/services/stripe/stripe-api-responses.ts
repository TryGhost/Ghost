/**
 * Schemas for what `StripeAPI` returns, the response-side counterpart of
 * `checkout-session-params.ts`. Each declares only the fields Ghost reads from the response, as
 * loose objects, so every other field passes through as Stripe sent it. A field is optional only
 * where Stripe may leave it out or where Ghost already copes without it.
 */
import errors from '@tryghost/errors';
import { z } from 'zod';
import { ExpandableId, StripeName } from './codecs';

/**
 * The code on the error `readResponse` throws, which the webhook classifies as Ghost's failure
 * (see `webhook/failures.ts`).
 */
export const UNREADABLE_RESPONSE = 'STRIPE_RESPONSE_UNREADABLE';

/**
 * Reads Stripe's response about `object`, such as `subscription sub_123`, with `schema`. A
 * response Ghost can't read, such as one missing a field Ghost relies on, fails here, naming the
 * object and the fields that didn't match, rather than wherever a field is first used.
 */
export function readResponse<Schema extends z.ZodType>(
  schema: Schema,
  response: unknown,
  object: string,
): z.output<Schema> {
  const read = schema.safeParse(response);
  if (!read.success) {
    throw new errors.InternalServerError({
      message: "Stripe returned an object Ghost can't read",
      code: UNREADABLE_RESPONSE,
      context: `${object}: ${z.prettifyError(read.error)}`,
      err: read.error,
    });
  }
  return read.data;
}

/**
 * The wallet a card was used through, as Stripe names it, such as `apple_pay` or `google_pay`.
 * Read as Stripe sends it, so a wallet Stripe adds reads as its own name.
 */
const StripeWallet = z.string().brand<'StripeWallet'>();

export type StripeWallet = z.output<typeof StripeWallet>;

/**
 * A payment method a request expanded: the cardholder's name, and the wallet the card was used
 * through, such as Apple Pay.
 */
const ExpandedPaymentMethod = z
  .object({
    billing_details: z.object({ name: StripeName.nullish() }).loose(),
    card: z
      .object({ wallet: z.object({ type: StripeWallet }).loose().nullish() })
      .loose()
      .nullish(),
  })
  .loose();

/** A subscription in a customer's list of subscriptions. */
const CustomerSubscription = z
  .object({
    id: z.string(),
    customer: ExpandableId,
    default_payment_method: z.union([z.string(), ExpandedPaymentMethod]).nullish(),
  })
  .loose();

/**
 * A Stripe customer as `StripeAPI.getCustomer` returns it, with its subscriptions expanded. Names,
 * its own and each cardholder's, are shortened to fit what Ghost stores. A deleted customer has
 * only its id.
 */
export const StripeCustomer = z.discriminatedUnion('deleted', [
  z.object({ id: z.string(), deleted: z.literal(true) }).loose(),
  z
    .object({
      id: z.string(),
      deleted: z.undefined().optional(),
      email: z.string().nullish(),
      name: StripeName.nullish(),
      invoice_settings: z
        .object({ default_payment_method: ExpandableId.nullish() })
        .loose()
        .nullish(),
      subscriptions: z.object({ data: z.array(CustomerSubscription) }).loose(),
    })
    .loose(),
]);

export type StripeCustomer = z.output<typeof StripeCustomer>;

/** A price, which Ghost saves on the member's subscription and on the tier it belongs to. */
const StripePrice = z
  .object({
    id: z.string(),
    product: ExpandableId,
    active: z.boolean(),
    nickname: z.string().nullish(),
    currency: z.string(),
    // Stripe leaves it empty for a tiered price or one where the buyer picks the amount.
    unit_amount: z.number().nullable(),
    type: z.string(),
    recurring: z.object({ interval: z.string() }).loose().nullish(),
  })
  .loose();

/**
 * A coupon, which Ghost turns into an offer. A coupon is either a percentage or an amount off, so
 * one of the two is null. Stripe always sends both, and Ghost tells them apart by which is null,
 * so neither may be left out.
 */
const StripeCoupon = z
  .object({
    id: z.string(),
    duration: z.string(),
    duration_in_months: z.number().nullable(),
    percent_off: z.number().nullable(),
    amount_off: z.number().nullable(),
    currency: z.string().nullable(),
  })
  .loose();

/** A subscription's discount: its coupon, and when the discount started and ends. */
const StripeDiscount = z
  .object({
    coupon: StripeCoupon,
    start: z.number(),
    // Null for a coupon that lasts forever.
    end: z.number().nullable(),
  })
  .loose();

/**
 * A Stripe subscription, as `StripeAPI` returns it without expanding anything. Its `plan` is
 * present only when it has a single price. Its metadata is the attribution Ghost wrote when the
 * checkout started, and the cancellation reason a member gave.
 */
export const StripeSubscription = z
  .object({
    id: z.string(),
    customer: ExpandableId,
    status: z.string(),
    cancel_at_period_end: z.boolean(),
    current_period_end: z.number(),
    start_date: z.number(),
    // Null until the subscription is canceled, or set to end with its current period.
    canceled_at: z.number().nullable(),
    trial_start: z.number().nullish(),
    trial_end: z.number().nullish(),
    default_payment_method: ExpandableId.nullish(),
    items: z
      .object({ data: z.array(z.object({ id: z.string(), price: StripePrice }).loose()) })
      .loose(),
    plan: z.object({ nickname: z.string().nullish(), product: ExpandableId }).loose().nullish(),
    discount: StripeDiscount.nullish(),
    metadata: z.record(z.string(), z.string()).nullish(),
    cancellation_details: z.object({ reason: z.string().nullish() }).loose().nullish(),
  })
  .loose();

export type StripeSubscription = z.output<typeof StripeSubscription>;

/**
 * A subscription as Stripe returns it after Ghost creates, changes or cancels it. Ghost reads only
 * which subscription it is, its customer and its status: to save the change, Ghost fetches the
 * subscription again (see `MemberRepository.linkSubscription`). Stripe always sends these fields,
 * so a write Stripe has made is never refused over the rest of its response.
 */
export const SubscriptionReference = z
  .object({ id: z.string(), customer: ExpandableId, status: z.string() })
  .loose();

export type SubscriptionReference = z.output<typeof SubscriptionReference>;

/**
 * A setup intent from a checkout that saves a member's new card: the card, and the Stripe customer
 * Ghost created the checkout for. Setup intents from older Ghost versions also name the
 * subscription to put the card on. Both are Ghost's own metadata, which a setup intent Ghost
 * didn't create doesn't have.
 */
export const StripeSetupIntent = z
  .object({
    payment_method: ExpandableId,
    metadata: z
      .object({ customer_id: z.string().optional(), subscription_id: z.string().optional() })
      .loose(),
  })
  .loose();

export type StripeSetupIntent = z.output<typeof StripeSetupIntent>;

/** A payment method, whose card's last four digits Ghost saves on the member's subscription. */
export const StripePaymentMethod = z
  .object({
    type: z.string(),
    card: z.object({ last4: z.string() }).loose().nullish(),
  })
  .loose();

export type StripePaymentMethod = z.output<typeof StripePaymentMethod>;

/** A product Ghost created for a tier. */
export const StripeProduct = z.object({ id: z.string() }).loose();

export type StripeProduct = z.output<typeof StripeProduct>;
