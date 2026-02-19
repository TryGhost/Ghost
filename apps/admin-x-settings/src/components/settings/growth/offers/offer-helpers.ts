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
