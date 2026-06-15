import {describe, it, expect, vi} from 'vitest';
import {isPaidTier, priceFor, isCurrent, hasBothCadences, loadTiers, yearlyDiscount, maxYearlyDiscount, priceParts} from './plans';
import type {MemberTier, Subscription} from '../../shared/api-client';
import type {Services} from '../../types';

const silver: MemberTier = {id: 't1', name: 'Silver', monthly_price: 500, yearly_price: 5000, currency: 'usd'};
const gold: MemberTier = {id: 't2', name: 'Gold', yearly_price: 9000, currency: 'usd'};
const freeish: MemberTier = {id: 't3', name: 'Free', monthly_price: 0, yearly_price: 0};

describe('isPaidTier', () => {
    it('is true when a positive price exists', () => {
        expect(isPaidTier(silver)).toBe(true);
        expect(isPaidTier(gold)).toBe(true);
    });

    it('is false for zero/missing prices', () => {
        expect(isPaidTier(freeish)).toBe(false);
        expect(isPaidTier({})).toBe(false);
    });
});

describe('priceFor', () => {
    it('returns the price for the requested cadence', () => {
        expect(priceFor(silver, 'month')).toEqual({amount: 500, currency: 'usd', interval: 'month'});
        expect(priceFor(silver, 'year')).toEqual({amount: 5000, currency: 'usd', interval: 'year'});
    });

    it('returns null when the cadence has no price', () => {
        expect(priceFor(gold, 'month')).toBeNull();
    });

    it('defaults currency to usd', () => {
        expect(priceFor({monthly_price: 100}, 'month')?.currency).toBe('usd');
    });
});

describe('isCurrent', () => {
    const sub = {tier: {id: 't1', name: 'Silver'}, price: {interval: 'month'}} as Subscription;

    it('matches on tier id + interval', () => {
        expect(isCurrent({id: 't1'}, 'month', sub)).toBe(true);
    });

    it('does not match a different cadence or tier', () => {
        expect(isCurrent({id: 't1'}, 'year', sub)).toBe(false);
        expect(isCurrent({id: 't2'}, 'month', sub)).toBe(false);
    });

    it('is false without a subscription', () => {
        expect(isCurrent({id: 't1'}, 'month', null)).toBe(false);
    });
});

describe('hasBothCadences', () => {
    it('is true when a tier has both prices', () => {
        expect(hasBothCadences([silver])).toBe(true);
    });

    it('is false when no tier has both', () => {
        expect(hasBothCadences([gold])).toBe(false);
    });
});

describe('yearlyDiscount', () => {
    it('computes the percent saved vs 12x monthly', () => {
        // 12 * 500 = 6000; yearly 5000 → saves 1000/6000 ≈ 17%
        expect(yearlyDiscount(500, 5000)).toBe(17);
    });

    it('is 0 when there is no saving or inputs are missing', () => {
        expect(yearlyDiscount(500, 6000)).toBe(0);
        expect(yearlyDiscount(undefined, 5000)).toBe(0);
        expect(yearlyDiscount(500, undefined)).toBe(0);
    });
});

describe('maxYearlyDiscount', () => {
    it('returns the largest discount across tiers', () => {
        expect(maxYearlyDiscount([silver, gold])).toBe(yearlyDiscount(500, 5000));
    });
});

describe('priceParts', () => {
    it('splits symbol from a whole amount with no decimals', () => {
        const parts = priceParts({amount: 500, currency: 'usd', interval: 'month'}, 'en');
        expect(parts.symbol).toBe('$');
        expect(parts.amount).toBe('5');
    });

    it('keeps decimals for fractional amounts', () => {
        const parts = priceParts({amount: 550, currency: 'usd', interval: 'month'}, 'en');
        expect(parts.amount).toBe('5.50');
    });
});

describe('loadTiers', () => {
    function servicesWithTiers(tiers: MemberTier[] | undefined): Services {
        return {getState: () => ({site: {tiers}})} as unknown as Services;
    }

    it('prefers state-blob tiers, filtered to paid', async () => {
        const services = servicesWithTiers([silver, gold, freeish]);
        const api = {site: {tiers: vi.fn()}} as never;
        const result = await loadTiers(services, api);
        expect(result.map(t => t.id)).toEqual(['t1', 't2']);
    });

    it('falls back to the content API when the blob has no tiers', async () => {
        const services = servicesWithTiers(undefined);
        const api = {site: {tiers: vi.fn().mockResolvedValue({tiers: [silver, freeish]})}} as never;
        const result = await loadTiers(services, api);
        expect(result.map(t => t.id)).toEqual(['t1']);
    });

    it('returns [] when the fallback throws', async () => {
        const services = servicesWithTiers(undefined);
        const api = {site: {tiers: vi.fn().mockRejectedValue(new Error('no api'))}} as never;
        expect(await loadTiers(services, api)).toEqual([]);
    });
});
