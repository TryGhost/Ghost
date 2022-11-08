import {MATCH_RELATION_OPTIONS} from './relation-options';

export const SUBSCRIPTION_STATUS_FILTER = {
    label: 'Stripe subscription status', 
    name: 'subscriptions.status', 
    columnLabel: 'Subscription Status', 
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Active', name: 'active'},
        {label: 'Trialing', name: 'trialing'},
        {label: 'Canceled', name: 'canceled'},
        {label: 'Unpaid', name: 'unpaid'},
        {label: 'Past Due', name: 'past_due'},
        {label: 'Incomplete', name: 'incomplete'},
        {label: 'Incomplete - Expired', name: 'incomplete_expired'}
    ]
};
