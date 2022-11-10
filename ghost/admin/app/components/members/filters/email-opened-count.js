import {NUMBER_RELATION_OPTIONS} from './relation-options';
import {formatNumber} from 'ghost-admin/helpers/format-number';

export const EMAIL_OPENED_COUNT_FILTER = {
    label: 'Emails opened (all time)', 
    name: 'email_opened_count', 
    columnLabel: 'Email opened count', 
    valueType: 'number', 
    relationOptions: NUMBER_RELATION_OPTIONS,
    getColumnValue: (member) => {
        return {
            text: formatNumber(member.emailOpenedCount)
        };
    }
};
