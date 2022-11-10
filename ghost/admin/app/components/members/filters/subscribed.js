import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIBED_FILTER = {
    label: 'Newsletter subscription', 
    name: 'subscribed', 
    columnLabel: 'Subscribed', 
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Subscribed', name: 'true'},
        {label: 'Unsubscribed', name: 'false'}
    ],
    getColumnValue: (member) => {
        return {
            text: member.subscribed ? 'Yes' : 'No'
        };
    }
};
