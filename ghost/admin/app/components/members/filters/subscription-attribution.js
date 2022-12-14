import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIPTION_ATTRIBUTION_FILTER = {
    label: 'Subscription started on post/page', 
    name: 'conversion', 
    valueType: 'string', 
    resource: 'post', 
    relationOptions: MATCH_RELATION_OPTIONS,
    columnLabel: 'Subscription started on',
    setting: 'membersTrackSources',
    getColumnValue: (member, filter) => {
        return {
            text: filter.resource?.title ?? ''
        };
    }
};
