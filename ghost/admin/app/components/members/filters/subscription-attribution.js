import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIPTION_ATTRIBUTION_FILTER = {
    label: 'Subscription started on post/page', 
    name: 'conversion', 
    valueType: 'string', 
    resource: 'post', 
    feature: 'memberAttribution', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumns: filter => [
        {
            label: 'Subscription started on',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        }
    ]
};
