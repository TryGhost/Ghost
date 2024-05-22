import {MATCH_RELATION_OPTIONS} from './relation-options';

export const EMAIL_CLICKED_FILTER = {
    label: 'Clicked email', 
    name: 'clicked_links.post_id', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: MATCH_RELATION_OPTIONS,
    columnLabel: 'Clicked email',
    setting: 'emailTrackClicks',
    getColumnValue: (member, filter) => {
        return {
            text: filter.resource?.title ?? ''
        };
    }
};
