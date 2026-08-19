import {PAST_TIMESTAMP_OPERATORS, columnAddressing} from '@/shared/filters';
import type {FieldDescriptor} from '@/shared/filters';

const COMMENT_FIELDS: FieldDescriptor[] = [
    {
        key: 'status', icon: 'circle',
        type: 'scalar',
        operators: ['is'],
        options: [
            {value: 'published', label: 'Published'},
            {value: 'hidden', label: 'Hidden'}
        ],
        ui: {label: 'Status', searchable: false, hideOperatorSelect: true}
    },
    {
        key: 'created_at', icon: 'calendar',
        type: 'timestamp',
        operators: PAST_TIMESTAMP_OPERATORS,
        ui: {label: 'Date'}
    },
    {
        key: 'body', icon: 'message-text',
        type: 'text',
        operators: ['contains', 'does-not-contain'],
        addressing: columnAddressing({field: 'html'}),
        parseKeys: ['html'],
        ui: {
            label: 'Text',
            placeholder: 'Search comment text...',
            className: 'w-full max-w-48',
            popoverContentClassName: 'w-full max-w-48'
        }
    },
    {
        key: 'post', icon: 'file-text',
        type: 'scalar',
        operators: ['is', 'is-not'],
        addressing: columnAddressing({field: 'post_id'}),
        parseKeys: ['post_id'],
        ui: {
            label: 'Post',
            searchable: true,
            className: 'w-full max-w-80',
            popoverContentClassName: 'w-full max-w-[calc(100vw-32px)] max-w-80'
        }
    },
    {
        key: 'author', icon: 'person',
        type: 'scalar',
        operators: ['is', 'is-not'],
        addressing: columnAddressing({field: 'member_id'}),
        parseKeys: ['member_id'],
        ui: {
            label: 'Author',
            searchable: true,
            className: 'w-80',
            popoverContentClassName: 'w-80'
        }
    },
    {
        key: 'reported', icon: 'flag',
        type: 'count',
        valueConfig: {threshold: 0, absentForm: 'equals'},
        addressing: columnAddressing({field: 'count.reports'}),
        parseKeys: ['count.reports'],
        options: [
            {value: 'true', label: 'Yes'},
            {value: 'false', label: 'No'}
        ],
        ui: {label: 'Reported', type: 'select', searchable: false, hideOperatorSelect: true}
    }
];

export {COMMENT_FIELDS};
