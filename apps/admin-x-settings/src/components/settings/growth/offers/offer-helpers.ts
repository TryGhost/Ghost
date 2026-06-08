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
    const baseHref = '/ghost/#/members';
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
