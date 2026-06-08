import {type Offer} from '@tryghost/admin-x-framework/api/offers';

type RetentionCadence = 'month' | 'year';

export type RetentionOffer = {
    id: string;
    name: string;
    description: string;
    terms: string | null; // e.g. "50% OFF" when active
    termsDetail: string | null; // e.g. "Next payment" when active
    redemptionOfferIds: string[];
    redemptions: number;
    status: 'active' | 'inactive';
};

const getActiveRetentionOfferByCadence = (offers: Offer[], cadence: RetentionCadence): Offer | null => {
    return offers.find((offer) => {
        return offer.redemption_type === 'retention' &&
            offer.cadence === cadence &&
            offer.status === 'active';
    }) || null;
};

const getRetentionRedemptionsByCadence = (offers: Offer[], cadence: RetentionCadence): number => {
    return offers.reduce((total, offer) => {
        if (offer.redemption_type !== 'retention' || offer.cadence !== cadence) {
            return total;
        }

        return total + (offer.redemption_count || 0);
    }, 0);
};

const getRetentionOfferIdsByCadence = (offers: Offer[], cadence: RetentionCadence): string[] => {
    return offers
        .filter((offer) => {
            return offer.redemption_type === 'retention' && offer.cadence === cadence;
        })
        .map(offer => offer.id);
};

const isFreeMonthsOffer = (offer: Offer): boolean => {
    return offer.type === 'percent' && offer.amount === 100 && offer.duration === 'repeating';
};

const getRetentionTerms = (offer: Offer | null): string | null => {
    if (!offer) {
        return null;
    }

    if (isFreeMonthsOffer(offer)) {
        const months = offer.duration_in_months || 0;
        const monthLabel = months === 1 ? 'month' : 'months';
        return `${months} ${monthLabel} free`;
    }

    if (offer.type === 'percent') {
        return `${offer.amount}% OFF`;
    }

    return null;
};

const getRetentionTermsDetail = (offer: Offer | null): string | null => {
    if (!offer) {
        return null;
    }

    if (isFreeMonthsOffer(offer)) {
        return '';
    }

    if (offer.duration === 'once') {
        return 'First payment';
    }

    if (offer.duration === 'repeating' && offer.duration_in_months) {
        const monthLabel = offer.duration_in_months === 1 ? 'month' : 'months';
        return `For ${offer.duration_in_months} ${monthLabel}`;
    }

    if (offer.duration === 'forever') {
        return 'Forever';
    }

    return null;
};

export const getRetentionOffers = (offers: Offer[]): RetentionOffer[] => {
    const monthlyOffer = getActiveRetentionOfferByCadence(offers, 'month');
    const yearlyOffer = getActiveRetentionOfferByCadence(offers, 'year');
    const monthlyOfferIds = getRetentionOfferIdsByCadence(offers, 'month');
    const yearlyOfferIds = getRetentionOfferIdsByCadence(offers, 'year');
    const monthlyRedemptions = getRetentionRedemptionsByCadence(offers, 'month');
    const yearlyRedemptions = getRetentionRedemptionsByCadence(offers, 'year');

    return [
        {
            id: 'monthly',
            name: 'Monthly retention',
            description: 'Applied to monthly plans',
            terms: getRetentionTerms(monthlyOffer),
            termsDetail: getRetentionTermsDetail(monthlyOffer),
            redemptionOfferIds: monthlyOfferIds,
            redemptions: monthlyRedemptions,
            status: monthlyOffer ? 'active' : 'inactive'
        },
        {
            id: 'yearly',
            name: 'Yearly retention',
            description: 'Applied to annual plans',
            terms: getRetentionTerms(yearlyOffer),
            termsDetail: getRetentionTermsDetail(yearlyOffer),
            redemptionOfferIds: yearlyOfferIds,
            redemptions: yearlyRedemptions,
            status: yearlyOffer ? 'active' : 'inactive'
        }
    ];
};
