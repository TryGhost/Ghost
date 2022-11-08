import {MATCH_RELATION_OPTIONS} from './relation-options';
import {capitalizeFirstLetter} from 'ghost-admin/helpers/capitalize-first-letter';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

export const PLAN_INTERVAL_FILTER = {
    label: 'Billing period', 
    name: 'subscriptions.plan_interval', 
    columnLabel: 'Billing period', 
    relationOptions: MATCH_RELATION_OPTIONS,
    valueType: 'options',
    options: [
        {label: 'Monthly', name: 'month'},
        {label: 'Yearly', name: 'year'}
    ],
    getColumnValue: (member) => {
        const subscription = mostRecentlyUpdated(member.subscriptions);
        if (!subscription) {
            return null;
        }
        return {
            text: capitalizeFirstLetter(subscription.price?.interval)
        };
    }
};
