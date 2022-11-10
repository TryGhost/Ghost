const FEEDBACK_RELATION_OPTIONS = [
    {label: 'More like this', name: 1},
    {label: 'Less like this', name: 0}
];

export const AUDIENCE_FEEDBACK_FILTER = {
    label: 'Responded with feedback', 
    name: 'newsletter_feedback', 
    valueType: 'string', 
    resource: 'email', 
    relationOptions: FEEDBACK_RELATION_OPTIONS,
    feature: 'audienceFeedback', 
    buildNqlFilter: (filter) => {
        // Added brackets to make sure we can parse as a single AND filter
        return `(feedback.post_id:${filter.value}+feedback.score:${filter.relation})`;
    },
    parseNqlFilter: (filter) => {
        if (!filter.$and) {
            return;
        }
        if (filter.$and.length === 2) {
            if (filter.$and[0]['feedback.post_id'] && filter.$and[1]['feedback.score'] !== undefined) {
                return {
                    relation: parseInt(filter.$and[1]['feedback.score']),
                    value: filter.$and[0]['feedback.post_id']
                };
            }
        }
    },
    getColumns: filter => [
        {
            label: 'Email',
            getValue: () => {
                return {
                    class: '',
                    text: filter.resource?.title ?? ''
                };
            }
        },
        {
            label: 'Feedback',
            getValue: () => {
                return {
                    class: 'gh-members-list-feedback',
                    text: filter.relation === 1 ? 'More like this' : 'Less like this',
                    icon: filter.relation === 1 ? 'event-more-like-this' : 'event-less-like-this'
                };
            }
        }
    ]
};
