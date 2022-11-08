import {MATCH_RELATION_OPTIONS} from './relation-options';

export const PLAN_INTERVAL_FILTER = {
    label: 'Billing period', 
    name: 'subscriptions.plan_interval', 
    columnLabel: 'Billing period', 
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Monthly', name: 'month'},
        {label: 'Yearly', name: 'year'}
    ]
};
