import errors from '@tryghost/errors';
import type { GiftCadence } from './gift-schema';

export type { GiftCadence } from './gift-schema';

export interface GiftCheckoutTier {
  status: string;
  visibility: string;
  type: string;
  currency: string | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  availableCadences?: 'all' | 'month' | 'year';
}

interface GiftDurationDefinition {
  cadence: GiftCadence;
  billingDuration: number;
  portalPlan: 'monthly' | 'yearly';
  priceProperty: 'monthlyPrice' | 'yearlyPrice';
  multiplier: number;
}

export interface ResolvedGiftDuration extends GiftDurationDefinition {
  totalMonths: number;
  isCadenceOnly: boolean;
}

export interface GiftCheckoutPlan {
  cadence: GiftCadence;
  duration: number;
  totalMonths: number;
  amount: number;
}

// Mirrored by the Portal catalogue in apps/portal/src/utils/gift-subscriptions.ts
// until later customization work makes durations server-provided
const GIFT_DURATION_CATALOGUE = new Map<number, GiftDurationDefinition>([
  [
    1,
    {
      cadence: 'month',
      billingDuration: 1,
      portalPlan: 'monthly',
      priceProperty: 'monthlyPrice',
      multiplier: 1,
    },
  ],
  [
    3,
    {
      cadence: 'month',
      billingDuration: 3,
      portalPlan: 'monthly',
      priceProperty: 'monthlyPrice',
      multiplier: 3,
    },
  ],
  [
    6,
    {
      cadence: 'month',
      billingDuration: 6,
      portalPlan: 'monthly',
      priceProperty: 'monthlyPrice',
      multiplier: 6,
    },
  ],
  [
    12,
    {
      cadence: 'year',
      billingDuration: 1,
      portalPlan: 'yearly',
      priceProperty: 'yearlyPrice',
      multiplier: 1,
    },
  ],
]);

function invalidGiftOffer(context: string) {
  return new errors.BadRequestError({
    message: 'Bad Request.',
    context,
  });
}

export function resolveGiftDuration({
  duration,
  cadence,
}: {
  duration?: number;
  cadence?: string;
}): ResolvedGiftDuration {
  let totalMonths = duration;

  if (totalMonths === undefined) {
    if (cadence === 'month') {
      totalMonths = 1;
    } else if (cadence === 'year') {
      totalMonths = 12;
    } else {
      throw invalidGiftOffer('Expected a supported gift duration or legacy cadence');
    }
  }

  if (typeof totalMonths !== 'number' || !Number.isInteger(totalMonths)) {
    throw invalidGiftOffer(`Unsupported gift duration "${totalMonths}"`);
  }

  const offer = GIFT_DURATION_CATALOGUE.get(totalMonths);

  if (!offer) {
    throw invalidGiftOffer(`Unsupported gift duration "${totalMonths}"`);
  }

  if (cadence !== undefined && cadence !== offer.cadence) {
    throw invalidGiftOffer(`Gift duration "${totalMonths}" conflicts with cadence "${cadence}"`);
  }

  return {
    ...offer,
    totalMonths,
    isCadenceOnly: duration === undefined,
  };
}

export function validateGiftCheckoutOffer({
  tier,
  portalPlans,
  offer,
}: {
  tier: GiftCheckoutTier;
  portalPlans: unknown;
  offer: ResolvedGiftDuration;
}): GiftCheckoutPlan {
  if (tier.status !== 'active' || tier.visibility !== 'public' || tier.type !== 'paid') {
    throw invalidGiftOffer('The requested tier is not available for gift purchases');
  }

  // Gifting is not a side door around per-tier cadence restriction: a short
  // gift of a yearly-only tier would reconstruct the monthly product the
  // publisher removed, so gift durations derive only from offered cadences.
  const availableCadences = tier.availableCadences ?? 'all';

  if (availableCadences === 'year' && offer.cadence !== 'year') {
    throw invalidGiftOffer('This tier only offers yearly gifts');
  }

  if (availableCadences === 'month' && offer.cadence === 'year') {
    // A 12-month gift of a monthly-only tier stays sellable, but it bills
    // from the monthly rate (12 × monthly) — no invented yearly discount
    offer = {
      ...offer,
      cadence: 'month',
      billingDuration: 12,
      portalPlan: 'monthly',
      priceProperty: 'monthlyPrice',
      multiplier: 12,
    };
  }

  // legacy cadence-only requests predate the Portal plan gate, keep them working
  if (
    !offer.isCadenceOnly &&
    (!Array.isArray(portalPlans) || !portalPlans.includes(offer.portalPlan))
  ) {
    throw invalidGiftOffer(`The ${offer.portalPlan} Portal plan is not available`);
  }

  const unitAmount = tier[offer.priceProperty];

  if (
    typeof unitAmount !== 'number' ||
    !Number.isSafeInteger(unitAmount) ||
    unitAmount <= 0 ||
    typeof tier.currency !== 'string' ||
    !tier.currency
  ) {
    throw invalidGiftOffer('The requested tier does not have a valid gift price');
  }

  const amount = unitAmount * offer.multiplier;

  if (!Number.isSafeInteger(amount)) {
    throw invalidGiftOffer('The requested gift amount is invalid');
  }

  return {
    cadence: offer.cadence,
    duration: offer.billingDuration,
    totalMonths: offer.totalMonths,
    amount,
  };
}
