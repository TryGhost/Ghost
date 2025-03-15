import {DATE_RELATION_OPTIONS} from './relation-options';
import {getDateColumnValue} from './columns/date-column';

export const LAST_SEEN_FILTER = {
    label: 'Last seen',
    name: 'last_seen_at',
    valueType: 'date',
    columnLabel: 'Last seen at',
    relationOptions: DATE_RELATION_OPTIONS,
    getColumnValue: (member, filter) => {
        return getDateColumnValue(member.lastSeenAtUTC, filter);
    }
};
