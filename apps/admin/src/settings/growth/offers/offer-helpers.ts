import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {currencyToDecimal, getSymbol} from '@/settings/app/utils/currency';
import {formatNumber} from '@tryghost/shade/utils';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

const MAX_RETENTION_OFFER_NAME_LENGTH = 40;

export const formatOfferTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('default', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};

export const createOfferRedemptionsFilterUrl = (offerIds: string[]): string => {
    const baseHref = `${getGhostPaths().adminRoot}#/members`;
    const filterValue = `offer_redemptions:[${offerIds.join(',')}]`;
    return `${baseHref}?filter=${encodeURIComponent(filterValue)}`;
};

export const createOfferRedemptionFilterUrl = (offerId: string): string => {
    return createOfferRedemptionsFilterUrl([offerId]);
};

const isFreeMonthsRetentionOffer = ({amount, duration}: {amount: number; duration: string}): boolean => {
    return amount === 100 && duration === 'repeating';
};

const buildRetentionOfferName = (description: string, hash: string): string => {
    return `Retention ${description} (${hash})`;
};

const getOfferDescription = ({amount, duration, durationInMonths}: {amount: number; duration: string; durationInMonths: number}): string => {
    if (isFreeMonthsRetentionOffer({amount, duration})) {
        const monthLabel = durationInMonths === 1 ? 'month' : 'months';
        return `${durationInMonths} ${monthLabel} free`;
    }

    if (duration === 'once') {
        return `${amount}% off once`;
    }

    if (duration === 'repeating') {
        return `${amount}% off for ${durationInMonths} mo`;
    }

    return `${amount}% off forever`;
};

export const generateRetentionOfferName = (input: {amount: number; duration: string; durationInMonths: number}, hash: string): string => {
    const normalizedHash = hash.trim();
    const description = getOfferDescription(input);
    const name = buildRetentionOfferName(description, normalizedHash);

    if (name.length <= MAX_RETENTION_OFFER_NAME_LENGTH) {
        return name;
    }

    const excessLength = name.length - MAX_RETENTION_OFFER_NAME_LENGTH;
    const truncatedHashLength = Math.max(3, normalizedHash.length - excessLength);

    return buildRetentionOfferName(description, normalizedHash.slice(0, truncatedHashLength));
};

export {
    MAX_RETENTION_OFFER_NAME_LENGTH
};

export type OfferType = 'percent' | 'fixed' | 'trial';

export const getOfferCadence = (cadence: string): string => {
    return cadence === 'month' ? 'monthly' : 'yearly';
};

export const getOfferDuration = (duration: string): string => {
    return (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');
};

export const getOfferDiscount = (type: string, amount: number, cadence: string, currency: string, tier: Tier | undefined): {discountOffer: string, originalPriceWithCurrency: string, updatedPriceWithCurrency: string} => {
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? tier?.monthly_price ?? 0 : tier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;

    const formatToTwoDecimals = (num: number): number => parseFloat(num.toFixed(2));
    const formatPrice = (num: number): string => formatNumber(formatToTwoDecimals(currencyToDecimal(num)), {maximumFractionDigits: 2});

    let originalPriceWithCurrency = getSymbol(currency) + formatPrice(originalPrice);

    switch (type) {
    case 'percent':
        discountOffer = `${formatNumber(amount)}% off`;
        updatedPrice = originalPrice - ((originalPrice * amount) / 100);
        break;
    case 'fixed':
        discountOffer = `${formatPrice(amount)} ${currency} off`;
        updatedPrice = originalPrice - amount;
        break;
    case 'trial':
        discountOffer = `${formatNumber(amount)} days free`;
        originalPriceWithCurrency = '';
        break;
    default:
        break;
    };

    if (updatedPrice < 0) {
        updatedPrice = 0;
    }

    const updatedPriceWithCurrency = getSymbol(currency) + formatPrice(updatedPrice);

    return {
        discountOffer,
        originalPriceWithCurrency,
        updatedPriceWithCurrency
    };
};
