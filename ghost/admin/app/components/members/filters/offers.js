import {MATCH_RELATION_OPTIONS} from './relation-options';

const getOfferNameForColumn = (offer) => {
    if (!offer) {
        return null;
    }

    if (offer.redemption_type === 'retention') {
        if (offer.cadence === 'month') {
            return 'Monthly Retention';
        }

        if (offer.cadence === 'year') {
            return 'Yearly Retention';
        }
    }

    return offer.name;
};

export const OFFERS_FILTER = {
    label: 'Offers',
    name: 'offer_redemptions',
    group: 'Subscription',
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'array',
    columnLabel: 'Offers redeemed',
    getColumnValue: (member) => {
        return {
            class: 'gh-members-list-labels',
            // TODO: remove sub.offer fallback once offer_redemptions is available on all environments
            text: (member.subscriptions ?? [])
                .flatMap(sub => (sub.offer_redemptions
                    ? sub.offer_redemptions.map(getOfferNameForColumn).filter(Boolean)
                    : [getOfferNameForColumn(sub.offer)].filter(Boolean)))
                .join(', ')
        };
    }
};
