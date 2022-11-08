import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_RECEIVED_FILTER = {
    label: 'Received email',
    name: 'emails.post_id', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumns: filter => [
        {
            label: 'Received email',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        }
    ]
};
