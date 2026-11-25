/**
 * What Ghost saves and records when it links a Stripe subscription to a member, worked out from
 * Ghost's description of the subscription (see `stripe/subscription-description.ts`).
 * `MemberRepository.linkSubscription` passes the description only to these functions, and saves
 * and records what they return.
 *
 * The rules for which subscriptions give a member access and which prices are complimentary are
 * here too, as the repository also applies them to the subscriptions and prices it has saved.
 */
import type {
  DiscountOff,
  SubscriptionDescription,
  SubscriptionDiscount,
  SubscriptionPrice,
} from '../../../stripe/subscription-description';

/** The statuses of a subscription that give its member access to its tier. */
const ACTIVE = new Set(['active', 'trialing', 'unpaid', 'past_due']);

/** Whether a subscription with Stripe's status `status` gives its member access to its tier. */
export function isActiveStatus(status: string): boolean {
  return ACTIVE.has(status);
}

/**
 * Whether a price nicknamed `nickname` is the complimentary price Ghost gives members a tier for
 * free with, which it names `Complimentary`, in any case.
 */
export function isComplimentaryNickname(nickname: string | null | undefined): boolean {
  return nickname?.toLowerCase() === 'complimentary';
}

/** The statuses of a subscription that brings in no revenue. */
const WITHOUT_REVENUE = new Set(['trialing', 'incomplete', 'incomplete_expired', 'canceled']);

/**
 * A subscription's monthly recurring revenue, in the smallest unit of its price's currency: 0
 * while it's trialing, not yet paid for, canceled or set to end with its current period. A
 * discount that lasts forever lowers it, while one that ends doesn't.
 *
 * Undefined when Ghost can't work it out, for a price without an amount, such as a tiered one.
 * Saved as undefined, a subscription keeps the MRR it has, and a new one gets the column's default
 * of 0.
 */
export function getMRR({
  interval,
  amount,
  status = null,
  canceled = false,
  discount = null,
}: {
  interval: SubscriptionPrice['interval'];
  amount: number | null;
  status?: string | null;
  /** Whether the subscription ends with its current period. */
  canceled?: boolean;
  discount?: SubscriptionDiscount | null;
}): number | undefined {
  if ((status !== null && WITHOUT_REVENUE.has(status)) || canceled) {
    return 0;
  }
  if (amount === null) {
    return undefined;
  }
  const charged = discount?.forever && discount.end === null ? less(amount, discount.off) : amount;
  switch (interval) {
    case 'year':
      return Math.floor(charged / 12);
    case 'month':
      return charged;
    case 'week':
      return charged * 4;
    case 'day':
      return charged * 30;
  }
}

/** `amount` with `off` taken off, never below 0. */
function less(amount: number, off: DiscountOff): number {
  switch (off.type) {
    case 'amount':
      return Math.max(0, amount - off.amount);
    case 'percent':
      return Math.round((amount * (100 - off.percent)) / 100);
  }
}

/**
 * The row Ghost saves in `members_stripe_customers_subscriptions` for a subscription, with the
 * offer the member took, or null.
 */
export function subscriptionRow(description: SubscriptionDescription, offerId: string | null) {
  const { price, discount } = description;
  return {
    customer_id: description.customerId,
    subscription_id: description.id,
    status: description.status,
    cancel_at_period_end: description.cancelAtPeriodEnd,
    cancellation_reason: description.cancellationReason,
    current_period_end: description.currentPeriodEnd,
    start_date: description.startDate,
    default_payment_card_last4: description.cardLast4,
    stripe_price_id: price.id,
    plan_id: price.id,
    trial_start_at: description.trialStart,
    trial_end_at: description.trialEnd,
    // The column isn't nullable, so a price without a nickname is saved under its interval.
    plan_nickname: price.nickname || price.interval,
    plan_interval: price.interval,
    plan_amount: price.amount,
    plan_currency: price.currency,
    mrr: getMRR({
      interval: price.interval,
      amount: price.amount,
      status: description.status,
      canceled: description.cancelAtPeriodEnd,
      discount,
    }),
    offer_id: offerId,
    discount_start: discount?.start ?? null,
    discount_end: discount?.end ?? null,
  };
}

/** The tier the subscription is for, as Ghost finds it: by its price's Stripe product. */
export function tierFilter({ price }: SubscriptionDescription): { stripe_product_id: string } {
  return { stripe_product_id: price.productId };
}

/** The subscription's price, as Ghost saves it on the tier the subscription is for. */
export function tierPrice({ price }: SubscriptionDescription) {
  return {
    stripe_price_id: price.id,
    stripe_product_id: price.productId,
    active: price.active,
    nickname: price.nickname,
    currency: price.currency,
    amount: price.amount,
    type: price.type,
    interval: price.interval,
  };
}

/**
 * The Stripe coupon of the subscription's discount, with how often the subscription bills, which
 * the offers code turns into the offer the member took. Null for a subscription without a
 * discount.
 */
export function couponOffer({ discount, price }: SubscriptionDescription): {
  coupon: SubscriptionDiscount['stripeCoupon'];
  cadence: SubscriptionPrice['interval'];
} | null {
  return discount ? { coupon: discount.stripeCoupon, cadence: price.interval } : null;
}

/** Whether the subscription gives its member access to its tier. */
export function givesAccess({ status }: SubscriptionDescription): boolean {
  return isActiveStatus(status);
}

/** Whether the subscription is waiting for its first payment, or gave up waiting for it. */
export function isIncomplete({ status }: SubscriptionDescription): boolean {
  return status === 'incomplete' || status === 'incomplete_expired';
}

/**
 * Whether a migration replaced the subscription with another and it's since been canceled, so
 * Ghost no longer keeps it.
 */
export function isReplacedByMigration({ migratedTo, status }: SubscriptionDescription): boolean {
  return migratedTo !== null && status === 'canceled';
}

/** Whether the subscription has a trial that hasn't ended yet. */
export function hasActiveTrial({ trialEnd }: SubscriptionDescription): boolean {
  return trialEnd !== null && trialEnd.getTime() > Date.now();
}

/**
 * The status the subscription gives its member while it's active: `comped` for a complimentary
 * price, otherwise `paid`. Null while it isn't active, as it then gives them no status.
 */
export function memberStatusFrom(description: SubscriptionDescription): 'paid' | 'comped' | null {
  if (!givesAccess(description)) {
    return null;
  }
  return isComplimentaryNickname(description.price.nickname) ? 'comped' : 'paid';
}

/**
 * What the paid subscription event Ghost records when a member starts paying through the
 * subscription takes from it: from no price to its price, in its price's currency.
 */
export function startedPayingEvent({ price }: SubscriptionDescription): {
  from_plan: null;
  to_plan: string;
  currency: string;
} {
  return { from_plan: null, to_plan: price.id, currency: price.currency };
}

/**
 * What the paid subscription event Ghost records when a subscription it has saved changes takes
 * from the subscription: to its price, or to no price once it's canceled, in its price's currency.
 * The price it changed from is the one Ghost had saved.
 */
export function changedPayingEvent({ status, price }: SubscriptionDescription): {
  to_plan: string | null;
  currency: string;
} {
  return { to_plan: status === 'canceled' ? null : price.id, currency: price.currency };
}

/**
 * The date of the events Ghost records when it links the subscription for the first time, such as
 * its member starting to pay through it: when the subscription started, which can be before Ghost
 * links it, as for a subscription a members import brings in.
 */
export function firstLinkEventDate({ startDate }: SubscriptionDescription): { created_at: Date } {
  return { created_at: startDate };
}

/**
 * When the subscription was canceled and when its member's access ends, for the staff email about
 * the cancellation: when it was canceled, if it `endedNow`, or else when its current period ends.
 */
export function cancellationDates(
  { canceledAt, currentPeriodEnd }: SubscriptionDescription,
  endedNow: boolean,
): { canceledAt: Date; expiryAt: Date } {
  // Stripe always sets `canceled_at` on a canceled subscription.
  const at = canceledAt ?? new Date();
  return { canceledAt: at, expiryAt: endedNow ? at : currentPeriodEnd };
}

/** Where a member came from, as Ghost records it with the start of their subscription. */
export interface StartAttribution {
  id: string | null;
  url: string | null;
  type: string | null;
  referrerSource: string | null;
  referrerMedium: string | null;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

/**
 * Where a member came from, for the start of their subscription: each part `given` by the link,
 * such as by the checkout that started the subscription, or else the part Ghost wrote into the
 * subscription's metadata.
 */
export function startAttribution(
  given: { [Part in keyof StartAttribution]?: string | null } | undefined,
  { attribution }: SubscriptionDescription,
): StartAttribution {
  return {
    id: given?.id ?? attribution.attributionId,
    url: given?.url ?? attribution.attributionUrl,
    type: given?.type ?? attribution.attributionType,
    referrerSource: given?.referrerSource ?? attribution.referrerSource,
    referrerMedium: given?.referrerMedium ?? attribution.referrerMedium,
    referrerUrl: given?.referrerUrl ?? attribution.referrerUrl,
    utmSource: given?.utmSource ?? attribution.utmSource,
    utmMedium: given?.utmMedium ?? attribution.utmMedium,
    utmCampaign: given?.utmCampaign ?? attribution.utmCampaign,
    utmTerm: given?.utmTerm ?? attribution.utmTerm,
    utmContent: given?.utmContent ?? attribution.utmContent,
  };
}
