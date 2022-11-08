import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_OPENED_FILTER = {
    label: 'Opened email', 
    name: 'opened_emails.post_id', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: MATCH_RELATION_OPTIONS,
    getColumns: filter => [
        {
            label: 'Opened email',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        }
    ]
};
