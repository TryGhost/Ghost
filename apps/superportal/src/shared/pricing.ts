/**
 * Cross-feature price + offer helpers. Lives in shared/ because both the
 * members chunk (plan selection, retention-offer-on-cancel) and the offers
 * chunk need them, and feature chunks may not import each other.
 *
 * Offer pricing logic ports Portal's `getUpdatedOfferPrice` / `getOfferOffAmount`
 * / `isRetentionOffer` / `isActiveOffer` (apps/portal/src/utils/helpers.js).
 */

import type {Offer} from './api-client/types';
import type {Translator} from '../types';

export type Cadence = 'month' | 'year';

export interface TierPrice {
    amount: number;
    currency: string;
    interval: Cadence;
}

export interface TierPrices {
    monthly_price?: number;
    yearly_price?: number;
    currency?: string;
}

/** A tier offers a paid plan when it has a positive monthly or yearly price. */
export function isPaidTier(tier: TierPrices): boolean {
    return (tier.monthly_price != null && tier.monthly_price > 0)
        || (tier.yearly_price != null && tier.yearly_price > 0);
}

/** Price for a tier at a given cadence, or null when that cadence has no price. */
export function priceFor(tier: TierPrices, cadence: Cadence): TierPrice | null {
    const amount = cadence === 'month' ? tier.monthly_price : tier.yearly_price;
    if (amount == null) return null;
    return {amount, currency: tier.currency || 'usd', interval: cadence};
}

/**
 * Split a price into a currency symbol and a localized amount, mirroring
 * Portal's superscript-symbol / large-amount treatment. Whole amounts drop the
 * decimals (e.g. "$5"); fractional amounts keep them (e.g. "$5.50").
 */
export function priceParts(price: TierPrice, locale = 'en'): {symbol: string; amount: string} {
    const value = price.amount / 100;
    const whole = Number.isInteger(value);
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: price.currency,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: whole ? 0 : 2,
            maximumFractionDigits: 2,
        }).formatToParts(value);
        const symbol = parts.filter(p => p.type === 'currency').map(p => p.value).join('');
        const amount = parts.filter(p => p.type !== 'currency').map(p => p.value).join('').trim();
        return {symbol, amount};
    } catch {
        return {symbol: `${price.currency.toUpperCase()} `, amount: whole ? value.toFixed(0) : value.toFixed(2)};
    }
}

/** Percentage saved by paying yearly vs 12× monthly. 0 when not computable. */
export function yearlyDiscount(monthly?: number, yearly?: number): number {
    if (!monthly || !yearly) return 0;
    const full = monthly * 12;
    if (full <= 0) return 0;
    return Math.round(((full - yearly) / full) * 100);
}

export function formatPrice(amount: number, currency: string, locale = 'en-US'): string {
    const value = amount / 100;
    try {
        return new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol'}).format(value);
    } catch {
        return `${currency.toUpperCase()} ${value.toFixed(2)}`;
    }
}

export function formatDate(iso: string | undefined | null, locale = 'en-US'): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
        return new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric'}).format(d);
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export function isRetentionOffer(offer: Offer): boolean {
    return offer.redemption_type === 'retention';
}

/** Active = status active AND a real tier exists (null-tier is only valid for retention). */
export function isActiveOffer(offer: Offer): boolean {
    if (offer.status && offer.status !== 'active') return false;
    return offer.tier != null || isRetentionOffer(offer);
}

/**
 * Apply an offer to a base price (in cents) and return the discounted cents.
 * Fixed → base − amount; percent → base − round(base × amount%); trial → base
 * (price is unchanged, the trial is free days).
 */
export function getDiscountedAmount(offer: Offer, baseAmountCents: number): number {
    if (offer.type === 'fixed') {
        return Math.max(0, baseAmountCents - offer.amount);
    }
    if (offer.type === 'percent') {
        const discount = Math.round(baseAmountCents * (offer.amount / 100));
        return Math.max(0, baseAmountCents - discount);
    }
    return baseAmountCents;
}

/**
 * Human-readable "amount off" token: "$15" (fixed), "50%" (percent), or the
 * number of free days (trial). The caller wraps it with the right phrasing
 * ("{x} off" vs "{x} days free") so the strings stay translatable.
 */
export function offerOffAmount(offer: Offer, locale = 'en'): string {
    if (offer.type === 'fixed') {
        const {symbol, amount} = priceParts({amount: offer.amount, currency: offer.currency || 'usd', interval: offer.cadence}, locale);
        return `${symbol}${amount}`;
    }
    if (offer.type === 'percent') {
        return `${offer.amount}%`;
    }
    return String(offer.amount);
}

/**
 * Renews/duration copy for an offer, ported from Portal's renderOfferMessage.
 * `originalLabel` is the pre-discount price string (e.g. "$50/year"); pass ''
 * to omit the "Renews at …" tail.
 */
export function offerDurationMessage(offer: Offer, originalLabel: string, t: Translator): string {
    const off = offerOffAmount(offer);
    const period = offer.cadence === 'month' ? t('month') : t('year');
    const renews = originalLabel ? ` ${t('Renews at {price}.', {price: originalLabel})}` : '';

    if (offer.type === 'trial' || offer.duration === 'trial') {
        return `${t('Try free for {amount} days, then {originalPrice}.', {amount: offer.amount, originalPrice: originalLabel})} ${t('Cancel anytime.')}`;
    }
    if (offer.duration === 'forever') {
        return t('{amount} off forever.', {amount: off});
    }
    if (offer.duration === 'once') {
        return `${t('{amount} off for first {period}.', {amount: off, period})}${renews}`;
    }
    if (offer.duration === 'repeating') {
        const months = offer.duration_in_months || 0;
        const first = months === 1
            ? t('{amount} off for first {period}.', {amount: off, period})
            : t('{amount} off for first {number} months.', {amount: off, number: months});
        return `${first}${renews}`;
    }
    return '';
}
