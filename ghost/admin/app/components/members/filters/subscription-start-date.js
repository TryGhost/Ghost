import {DATE_RELATION_OPTIONS} from './relation-options';
import {getDateColumnValue} from './columns/date-column';
import {mostRelevantSubscription} from 'ghost-admin/helpers/most-relevant-subscription';

export const SUBSCRIPTION_START_DATE_FILTER = {
    label: 'Paid start date',
    name: 'subscriptions.start_date',
    valueType: 'date',
    columnLabel: 'Paid start date',
    relationOptions: DATE_RELATION_OPTIONS,
    getColumnValue: (member, filter) => {
        const subscription = mostRelevantSubscription(member.subscriptions);
        return getDateColumnValue(subscription?.start_date, filter);
    }
};
