import {DATE_RELATION_OPTIONS} from './relation-options';
import {getDateColumnValue} from './columns/date-column';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

export const SUBSCRIPTION_START_DATE_FILTER = {
    label: 'Paid start date', 
    name: 'subscriptions.start_date', 
    valueType: 'date', 
    columnLabel: 'Paid start date', 
    relationOptions: DATE_RELATION_OPTIONS,
    getColumnValue: (member, filter) => {
        const subscription = mostRecentlyUpdated(member.subscriptions);
        return getDateColumnValue(subscription?.start_date, filter);
    }
};
