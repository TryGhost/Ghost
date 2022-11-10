import {DATE_RELATION_OPTIONS} from './relation-options';
import {getDateColumnValue} from './columns/date-column';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

export const NEXT_BILLING_DATE_FILTER = {
    label: 'Next billing date', 
    name: 'subscriptions.current_period_end', 
    valueType: 'date', 
    columnLabel: 'Next billing date', 
    relationOptions: DATE_RELATION_OPTIONS,
    getColumnValue: (member, filter) => {
        const subscription = mostRecentlyUpdated(member.subscriptions);
        return getDateColumnValue(subscription?.current_period_end, filter);
    }
};
