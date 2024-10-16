import {MATCH_RELATION_OPTIONS} from './relation-options';

export const TIER_FILTER = {
    label: 'Membership tier',
    name: 'tier_id',
    valueType: 'array',
    columnLabel: 'Membership tier',
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumnValue: (member) => {
        return {
            class: 'gh-members-list-labels',
            text: (member.tiers ?? []).map(label => label.name).join(', ')
        };
    }
};
