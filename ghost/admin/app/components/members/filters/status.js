import {MATCH_RELATION_OPTIONS} from './relation-options';

export const STATUS_FILTER = {
    label: 'Member status', 
    name: 'status', 
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Paid', name: 'paid'},
        {label: 'Free', name: 'free'},
        {label: 'Complimentary', name: 'comped'}
    ]
};
