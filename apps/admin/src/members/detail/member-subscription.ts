import moment from 'moment-timezone';
import { getSymbol } from '@tryghost/admin-x-framework';
import type { MemberSubscription, MemberTier } from '@tryghost/admin-x-framework/api/members';

export type SubscriptionKind = 'paid' | 'complimentary' | 'gift';

const COMPLIMENTARY_NICKNAME = 'complimentary';
const GIFT_NICKNAME = 'gift subscription';

/**
 * Classify a subscription for display. Comps and gifts are synthesised from the
 * member's tier with an empty Stripe subscription id, so the plan nickname tells
 * them apart; paid subs always carry an id.
 */
export function classifyMemberSubscription(sub: MemberSubscription): SubscriptionKind {
  if (sub.id) {
    return 'paid';
  }
  const nickname = sub.plan?.nickname?.toLowerCase() ?? '';
  if (nickname === COMPLIMENTARY_NICKNAME) {
    return 'complimentary';
  }
  if (nickname === GIFT_NICKNAME) {
    return 'gift';
  }
  return 'paid';
}

/**
 * Format a price amount (stored in the smallest currency unit, e.g. cents) with
 * the correct symbol AND locale thousands separators. Whole amounts show no
 * decimals; fractional amounts show two.
 *
 * The runtime locale comes from the user's browser. Tests should
 * therefore assert loosely (e.g. accepting either `,` or `.` as the thousands
 * separator) rather than pinning en-US.
 */
export function formatSubscriptionAmount(amount: number, currency: string): string {
  const symbol = getSymbol(currency);
  const value = amount / 100;
  const isWhole = value % 1 === 0;
  const formatted = value.toLocaleString(
    undefined,
    isWhole ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );
  return `${symbol}${formatted}`;
}

export function formatSubscriptionInterval(
  interval: MemberSubscription['price']['interval'],
): string {
  return interval === 'year' ? 'yearly' : 'monthly';
}

/**
 * The bold label that sits in front of the validity line.
 * Returns "Free trial" while a paid subscription's `trial_end_at` is in the future,
 * otherwise falls back to any `price.nickname` that isn't the plain "Monthly"/
 * "Yearly" interval label — that's how comps show "Complimentary" and gifts
 * show "Gift Subscription" (their price nicknames).
 */
export function getSubscriptionPriceLabel(sub: MemberSubscription): string | null {
  const isTrial = !!sub.trial_end_at && moment(sub.trial_end_at).isAfter(new Date(), 'day');
  if (isTrial) {
    return 'Free trial';
  }
  const nickname = sub.price?.nickname;
  if (nickname && nickname !== 'Monthly' && nickname !== 'Yearly') {
    return nickname;
  }
  return null;
}

/**
 * A subscription reads as "Canceled" when it is already canceled or set to cancel
 * at period end; otherwise "Active".
 */
export function getSubscriptionStatusLabel(sub: MemberSubscription): string {
  if (sub.status === 'canceled' || sub.cancel_at_period_end) {
    return 'Canceled';
  }
  return 'Active';
}

const formatDateLocal = (value: string | null | undefined) =>
  value ? moment(new Date(value)).format('D MMM YYYY') : '';
const formatDateUtc = (value: string | null | undefined) =>
  value ? moment(value).utc().format('D MMM YYYY') : '';

/**
 * The line of copy that appears under a subscription describing its lifecycle:
 * for paid — Renews / Has access until / Ended; for comp/gift — Expires or empty
 * for a forever comp; for paid trials — Ends. Branch order: hard-cancel first,
 * then soft-cancel (cancel_at_period_end), then trial, then default renewal.
 *
 * Dates: paid `current_period_end` renders in local time; comp/gift
 * `tier.expiry_at` renders in UTC.
 */
export function getSubscriptionValidityLabel(sub: MemberSubscription): string {
  const kind = classifyMemberSubscription(sub);
  if (kind === 'complimentary' || kind === 'gift') {
    const tierExpiry = formatDateUtc(sub.tier?.expiry_at);
    return tierExpiry ? `Expires ${tierExpiry}` : '';
  }

  // A hard cancel shows no date rather than a stale period end.
  const validUntil =
    sub.status === 'canceled' && !sub.cancel_at_period_end
      ? ''
      : formatDateLocal(sub.current_period_end);

  if (sub.status === 'canceled') {
    return validUntil ? `Ended ${validUntil}` : '';
  }
  if (sub.cancel_at_period_end) {
    return validUntil ? `Has access until ${validUntil}` : '';
  }
  // Trial only overrides the default "Renews" line — a canceled or period-ending
  // subscription that still has a Stripe trial_end wins with its cancel copy.
  if (sub.trial_end_at && moment(sub.trial_end_at).isAfter(new Date(), 'day')) {
    return `Ends ${formatDateLocal(sub.trial_end_at)}`;
  }
  return validUntil ? `Renews ${validUntil}` : '';
}

export interface SubscriptionGroup {
  tier: MemberTier;
  subscriptions: MemberSubscription[];
}

/**
 * Group a member's subscriptions by tier (deduping so a member with two subs to
 * the same tier renders under one heading). Drops subs without a tier or without
 * a price rather than crash the row on `sub.price.amount`.
 */
export function groupSubscriptionsByTier(subs: MemberSubscription[]): SubscriptionGroup[] {
  const groups: SubscriptionGroup[] = [];
  const byTier = new Map<string, SubscriptionGroup>();
  for (const sub of subs) {
    if (!sub.price) {
      continue;
    }
    const tier = sub.tier ?? (sub.price as { tier?: MemberTier }).tier;
    if (!tier?.id) {
      continue;
    }
    let group = byTier.get(tier.id);
    if (!group) {
      group = { tier, subscriptions: [] };
      byTier.set(tier.id, group);
      groups.push(group);
    }
    group.subscriptions.push(sub);
  }
  return groups;
}
