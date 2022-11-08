import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SIGNUP_ATTRIBUTION_FILTER = {
    label: 'Signed up on post/page', 
    name: 'signup', 
    valueType: 'string', 
    resource: 'post', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumns: filter => [
        {
            label: 'Signed up on',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        }
    ]
};
