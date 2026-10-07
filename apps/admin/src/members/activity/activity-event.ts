import { currencyToDecimal, getSymbol } from '@tryghost/admin-x-framework';
import { formatNumber } from '@tryghost/shade/utils';
import { cleanTrackedUrl } from '@/shared/clean-tracked-url';
import {
  parseMemberEvent,
  type MemberEventContext,
  type ParsedMemberEvent,
  type RawMemberEvent,
} from '@/members/detail/member-event';

const amountOptions = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

function eventMoney(amount: unknown, currency: unknown) {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    typeof currency !== 'string' ||
    !/^[a-z]{3}$/i.test(currency)
  ) {
    return undefined;
  }
  // Activity's stored monetary values follow Ember's getNonDecimal: divide by
  // 100 for every currency, including gifts. Do not infer a Stripe exponent.
  return { value: currencyToDecimal(amount), symbol: getSymbol(currency) };
}

function subscriptionInfo(event: RawMemberEvent, ctx: MemberEventContext): string | undefined {
  const money = eventMoney(event.data.mrr_delta, event.data.currency);
  if (!money || money.value === 0) {
    return undefined;
  }
  const amount = `${money.symbol}${formatNumber(Math.abs(money.value), amountOptions)}`;
  if (event.data.type === 'created') {
    const tierName =
      ctx.hasMultipleTiers && typeof event.data.tierName === 'string' && event.data.tierName.trim()
        ? event.data.tierName
        : 'Paid';
    return `${tierName} ${money.value < 0 ? '-' : ''}${amount}/month`;
  }
  return `MRR ${money.value > 0 ? '+' : '-'}${amount}`;
}

function giftAction(event: RawMemberEvent): string {
  const money = eventMoney(event.data.amount, event.data.currency);
  const { tier_name: tierName, duration, cadence } = event.data;
  if (
    !money ||
    typeof tierName !== 'string' ||
    !tierName.trim() ||
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration <= 0 ||
    typeof cadence !== 'string' ||
    !cadence.trim()
  ) {
    return 'Purchased gift subscription';
  }
  const amount = `${money.symbol}${formatNumber(money.value, amountOptions)}`;
  const cadenceLabel = duration === 1 ? cadence : `${cadence}s`;
  return `Purchased gift subscription for ${amount} (${tierName}, ${formatNumber(duration)} ${cadenceLabel})`;
}

/** Full Activity presentation; the existing member-detail preview stays unchanged. */
export function parseActivityEvent(
  event: RawMemberEvent,
  ctx: MemberEventContext,
): ParsedMemberEvent {
  // The detail parser formats gifts using a different currency exponent. Ask it
  // for the generic gift action, then apply Activity's historical format below.
  const parsed = parseMemberEvent(
    event.type === 'gift_purchase_event'
      ? { ...event, data: { ...event.data, amount: undefined } }
      : event,
    ctx,
  );

  if (event.type === 'subscription_event') {
    parsed.info = subscriptionInfo(event, ctx);
  }
  if (event.type === 'donation_event') {
    const money = eventMoney(event.data.amount, event.data.currency);
    parsed.info = money ? `${money.symbol}${formatNumber(money.value, amountOptions)}` : undefined;
  }
  if (event.type === 'gift_purchase_event') {
    parsed.action = giftAction(event);
    parsed.actionTitle = parsed.action;
  }
  if (event.type === 'click_event') {
    parsed.description =
      typeof parsed.description === 'string'
        ? cleanTrackedUrl(parsed.description, true)
        : undefined;
  }
  return parsed;
}
