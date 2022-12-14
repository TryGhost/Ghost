import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_SENT_FILTER = {
    label: 'Sent email',
    name: 'emails.post_id',
    valueType: 'string',
    resource: 'email',
    feature: 'suppressionList',
    relationOptions: MATCH_RELATION_OPTIONS,
    columnLabel: 'Sent email',
    getColumnValue: (member, filter) => {
        return {
            text: filter.resource?.title ?? ''
        };
    }
};
