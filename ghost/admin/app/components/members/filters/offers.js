import {MATCH_RELATION_OPTIONS} from './relation-options';

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
            text: (member.subscriptions ?? []).map(label => label.offer?.name).join(', ')
        };
    }
};
