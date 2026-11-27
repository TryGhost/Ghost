/**
 * Schemas for what `StripeAPI` returns, the response-side counterpart of
 * `checkout-session-params.ts`. Each declares only the fields Ghost reads from the response, as
 * loose objects, so every other field passes through as Stripe sent it. A field is optional only
 * where Stripe may leave it out or where Ghost already copes without it.
 */
import errors from '@tryghost/errors';
import { z } from 'zod';
import { AttributionMetadata } from './attribution-metadata';
import { ExpandableId, StripeName, StripeTimestamp } from './codecs';

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

/** How often a recurring price bills. */
const PriceInterval = z.enum(['day', 'week', 'month', 'year']);

export type PriceInterval = z.output<typeof PriceInterval>;

/**
 * A subscription's price, which Ghost saves on the member's subscription and on the tier it
 * belongs to. Stripe allows only recurring prices on a subscription, so it always recurs, and says
 * how often.
 */
const StripePrice = z
  .object({
    id: z.string(),
    product: ExpandableId,
    active: z.boolean(),
    nickname: z.string().nullish(),
    currency: z.string(),
    // Stripe leaves it empty for a tiered price or one where the buyer picks the amount.
    unit_amount: z.number().nullable(),
    type: z.literal('recurring'),
    recurring: z.object({ interval: PriceInterval }).loose(),
  })
  .loose();

/** What every coupon has: its id, and how long the discount it gives lasts. */
const CouponTerms = {
  id: z.string(),
  duration: z.string(),
  duration_in_months: z.number().nullable(),
};

/**
 * A coupon, which Ghost turns into an offer: a percentage off, or an amount off in a currency.
 * Stripe always sends both `percent_off` and `amount_off`, with the one the coupon doesn't give as
 * null, so a coupon that gives both or neither isn't one Ghost can read.
 */
const StripeCoupon = z.union([
  z
    .object({
      ...CouponTerms,
      percent_off: z.number(),
      amount_off: z.null(),
      currency: z.string().nullable(),
    })
    .loose(),
  z
    .object({ ...CouponTerms, percent_off: z.null(), amount_off: z.number(), currency: z.string() })
    .loose(),
]);

export type StripeCoupon = z.output<typeof StripeCoupon>;

/** A subscription's discount: its coupon, and when the discount started and ends. */
const StripeDiscount = z
  .object({
    coupon: StripeCoupon,
    start: StripeTimestamp,
    // Null when Stripe sets no end: for a coupon that lasts forever, and for a coupon applied once
    // to an existing subscription. Whether it lasts forever comes from the coupon's `duration`.
    end: StripeTimestamp.nullable(),
  })
  .loose();

/**
 * The metadata Ghost writes into a subscription: where the member came from, written when their
 * checkout starts, the reason they gave when they canceled in Portal, and the subscription a
 * migration replaced it with.
 */
const SubscriptionMetadata = AttributionMetadata.extend({
  cancellation_reason: z.string().optional(),
  ghost_migrated_to: z.string().optional(),
});

/**
 * A Stripe subscription, as `StripeAPI` returns it without expanding anything, with its times as
 * dates. Its `plan` is present only when it has a single price.
 */
export const StripeSubscription = z
  .object({
    id: z.string(),
    customer: ExpandableId,
    // Read as any string rather than as the statuses Stripe has now, as Stripe has added statuses
    // over time, and a status Ghost doesn't know shouldn't make the subscription unreadable.
    status: z.string(),
    cancel_at_period_end: z.boolean(),
    current_period_end: StripeTimestamp,
    start_date: StripeTimestamp,
    // Null until the subscription is canceled, or set to end with its current period.
    canceled_at: StripeTimestamp.nullable(),
    trial_start: StripeTimestamp.nullish(),
    trial_end: StripeTimestamp.nullish(),
    default_payment_method: ExpandableId.nullish(),
    // Every subscription has at least one price.
    items: z
      .object({ data: z.array(z.object({ id: z.string(), price: StripePrice }).loose()).min(1) })
      .loose(),
    plan: z.object({ product: ExpandableId }).loose().nullish(),
    discount: StripeDiscount.nullish(),
    metadata: SubscriptionMetadata.nullish(),
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
