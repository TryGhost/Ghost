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
            // TODO: remove sub.offer fallback once offer_redemptions is available on all environments
            text: (member.subscriptions ?? [])
                .flatMap(sub => (sub.offer_redemptions
                    ? sub.offer_redemptions.map(o => o.name)
                    : (sub.offer?.name ? [sub.offer.name] : [])))
                .join(', ')
        };
    }
};
