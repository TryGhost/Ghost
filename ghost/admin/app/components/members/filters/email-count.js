import {NUMBER_RELATION_OPTIONS} from './relation-options';
import {formatNumber} from 'ghost-admin/helpers/format-number';

export const EMAIL_COUNT_FILTER = {
    label: 'Emails sent (all time)',
    name: 'email_count',
    columnLabel: 'Email count',
    valueType: 'number',
    relationOptions: NUMBER_RELATION_OPTIONS,
    getColumnValue: (member) => {
        return {
            text: formatNumber(member.emailCount)
        };
    }
};
