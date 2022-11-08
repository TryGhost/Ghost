import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_CLICKED_FILTER = {
    label: 'Clicked email', 
    name: 'clicked_links.post_id', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumns: filter => [
        {
            label: 'Clicked email',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        }
    ]
};
