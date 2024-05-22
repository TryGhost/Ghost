import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_OPENED_FILTER = {
    label: 'Opened email', 
    name: 'opened_emails.post_id', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: MATCH_RELATION_OPTIONS,
    columnLabel: 'Opened email',
    setting: 'emailTrackOpens',
    getColumnValue: (member, filter) => {
        return {
            text: filter.resource?.title ?? ''
        };
    }
};
