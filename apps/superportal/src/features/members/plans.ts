/**
 * Members-specific tier helpers. The generic price primitives now live in
 * shared/pricing.ts (so the offers chunk can reuse them); they're re-exported
 * here so existing members imports stay stable.
 */

import type {Services} from '../../types';
import type {MembersApiClient, MemberTier, Subscription} from '../../shared/api-client';
import {warn} from '../../shared/log';
import {priceFor, priceParts, yearlyDiscount, isPaidTier, type Cadence, type TierPrice, type TierPrices} from '../../shared/pricing';

export {priceFor, priceParts, yearlyDiscount, isPaidTier};
export type {Cadence, TierPrice, TierPrices};

/**
 * Load visible paid tiers. Prefers the inline state blob; falls back to the
 * content API (returns [] if that isn't wired or fails).
 */
export async function loadTiers(services: Services, api: MembersApiClient): Promise<MemberTier[]> {
    const fromState = services.getState().site.tiers;
    if (fromState && fromState.length) {
        return fromState.filter(isPaidTier);
    }
    try {
        const res = await api.site.tiers();
        return (res.tiers || []).filter(isPaidTier);
    } catch (err) {
        warn('failed to load tiers', err);
        return [];
    }
}

/** True when this tier+cadence matches the member's current subscription. */
export function isCurrent(tier: {id: string}, cadence: Cadence, subscription?: Subscription | null): boolean {
    if (!subscription) return false;
    return subscription.tier?.id === tier.id && subscription.price?.interval === cadence;
}

/** Whether any tier offers both cadences — drives whether the monthly/yearly toggle shows. */
export function hasBothCadences(tiers: TierPrices[]): boolean {
    return tiers.some(t => t.monthly_price != null && t.yearly_price != null);
}

/** Largest yearly discount across tiers — drives the "(save X%)" label on the toggle. */
export function maxYearlyDiscount(tiers: TierPrices[]): number {
    return tiers.reduce((max, t) => Math.max(max, yearlyDiscount(t.monthly_price, t.yearly_price)), 0);
}

/** Benefit list display helpers — benefits may be strings or {name} objects. */
export function benefitName(b: {id?: string; name: string} | string): string {
    return typeof b === 'string' ? b : b.name;
}

export function benefitKey(b: {id?: string; name: string} | string, idx: number): string {
    return typeof b === 'string' ? `b-${idx}` : (b.id ?? `b-${idx}`);
}
