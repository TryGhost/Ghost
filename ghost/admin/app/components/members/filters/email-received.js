import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_RECEIVED_FILTER = {
    label: 'Received email',
    name: 'emails.post_id',
    valueType: 'string',
    resource: 'email',
    excludeForFeature: 'suppressionList',
    relationOptions: MATCH_RELATION_OPTIONS,
    columnLabel: 'Received email',
    getColumnValue: (member, filter) => {
        return {
            text: filter.resource?.title ?? ''
        };
    }
};
