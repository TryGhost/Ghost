/**
 * Ghost's description of a Stripe subscription: what Ghost saves when it links the subscription to
 * a member, in Ghost's terms. It's read from Stripe once, as `StripeAPI.getSubscriptionToLink`,
 * while the shapes Stripe returns stay in `stripe-api-responses.ts`.
 */
import { type Attribution, attributionOf } from './attribution-metadata';
import type {
  PriceInterval,
  StripeCoupon,
  StripeCustomer,
  StripePaymentMethod,
  StripeSubscription,
} from './stripe-api-responses';

/** The price a subscription is for, which Ghost saves on the subscription and on its tier. */
export interface SubscriptionPrice {
  id: string;
  /** The Stripe product the price belongs to, which tells Ghost the tier. */
  productId: string;
  active: boolean;
  nickname: string | null;
  currency: string;
  /**
   * In the currency's smallest unit. Null for a tiered price, or one where the buyer picks the
   * amount.
   */
  amount: number | null;
  /** Always `recurring`, as Stripe allows only recurring prices on a subscription. */
  type: 'recurring';
  /** How often the price bills. */
  interval: PriceInterval;
}

/**
 * What a discount takes off each payment: a percentage, or an amount in the smallest unit of a
 * currency.
 */
export type DiscountOff =
  | { type: 'percent'; percent: number }
  | { type: 'amount'; amount: number; currency: string };

/** A discount on a subscription, from a Stripe coupon. */
export interface SubscriptionDiscount {
  off: DiscountOff;
  /** Whether the discount lasts as long as the subscription does. */
  forever: boolean;
  start: Date;
  /**
   * Null when Stripe sets no end: for a discount that lasts forever, and for one applied once to an
   * existing subscription. `forever` says which.
   */
  end: Date | null;
  /** The coupon as Stripe sent it, which only the offers code reads, to turn it into an offer. */
  stripeCoupon: StripeCoupon;
}

/** A Stripe subscription, as Ghost links it to a member. */
export interface SubscriptionDescription {
  id: string;
  /** The Stripe customer the subscription belongs to. */
  customerId: string;
  /** Stripe's status, such as `active`, `trialing`, `past_due` or `canceled`. */
  status: string;
  /** Whether the subscription ends when its current period does. */
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
  startDate: Date;
  /**
   * When the subscription was canceled, or when it was set to end with its current period. Null
   * until either happens.
   */
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  price: SubscriptionPrice;
  discount: SubscriptionDiscount | null;
  /**
   * Why the subscription was canceled: the reason the member gave in Portal, or `Payment failed`
   * when Stripe canceled it after its payments failed. Null otherwise.
   */
  cancellationReason: string | null;
  /**
   * The subscription that replaced this one, when a migration moved the member to another, so Ghost
   * no longer keeps this one once it's canceled.
   */
  migratedTo: string | null;
  /** Where the member came from, as Ghost wrote it into the metadata when their checkout started. */
  attribution: Attribution;
  /** The last four digits of the card the subscription is paid with, or null without a card. */
  cardLast4: string | null;
}

/** The reads that describe a subscription, which `StripeAPI` makes. */
export interface SubscriptionReads {
  getSubscription(id: string): Promise<StripeSubscription>;
  getCustomer(id: string): Promise<StripeCustomer>;
  getCardPaymentMethod(id: string): Promise<StripePaymentMethod | null>;
}

/**
 * Reads subscription `id` from Stripe, with the card it's paid with: the subscription's own default
 * payment method, or else its customer's, which the billing portal sets when a member updates their
 * card there.
 */
export async function loadSubscriptionDescription(
  stripe: SubscriptionReads,
  id: string,
): Promise<SubscriptionDescription> {
  const subscription = await stripe.getSubscription(id);
  const paymentMethodId =
    subscription.default_payment_method ||
    (await customerPaymentMethodId(stripe, subscription.customer));
  const card = paymentMethodId ? await stripe.getCardPaymentMethod(paymentMethodId) : null;
  return describeSubscription(subscription, card);
}

/** The default payment method of Stripe customer `customerId`, or null when they have none. */
async function customerPaymentMethodId(
  stripe: SubscriptionReads,
  customerId: string,
): Promise<string | null> {
  const customer = await stripe.getCustomer(customerId);
  if (customer.deleted) {
    return null;
  }
  return customer.invoice_settings?.default_payment_method || null;
}

/** Describes `subscription`, paid with `card`, or with no card, in Ghost's terms. */
export function describeSubscription(
  subscription: StripeSubscription,
  card: StripePaymentMethod | null,
): SubscriptionDescription {
  const { metadata, discount } = subscription;
  // Ghost saves the subscription's first price, as the subscriptions Ghost creates have only one.
  const price = subscription.items.data[0].price;
  return {
    id: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.current_period_end,
    startDate: subscription.start_date,
    canceledAt: subscription.canceled_at,
    trialStart: subscription.trial_start ?? null,
    trialEnd: subscription.trial_end ?? null,
    price: {
      id: price.id,
      productId: price.product,
      active: price.active,
      nickname: price.nickname ?? null,
      currency: price.currency,
      amount: price.unit_amount,
      type: price.type,
      interval: price.recurring.interval,
    },
    discount: discount
      ? {
          off: offOf(discount.coupon),
          forever: discount.coupon.duration === 'forever',
          start: discount.start,
          end: discount.end,
          stripeCoupon: discount.coupon,
        }
      : null,
    cancellationReason: cancellationReasonOf(subscription),
    migratedTo: metadata?.ghost_migrated_to || null,
    attribution: attributionOf(metadata ?? {}),
    cardLast4: card?.card?.last4 || null,
  };
}

function offOf(coupon: StripeCoupon): DiscountOff {
  return coupon.amount_off === null
    ? { type: 'percent', percent: coupon.percent_off }
    : { type: 'amount', amount: coupon.amount_off, currency: coupon.currency };
}

function cancellationReasonOf({
  metadata,
  cancellation_details: details,
}: StripeSubscription): string | null {
  // Ghost writes the reason a member gives when they cancel in Portal into the metadata.
  if (metadata?.cancellation_reason) {
    return metadata.cancellation_reason;
  }
  if (details?.reason === 'payment_failed') {
    return 'Payment failed';
  }
  return null;
}
