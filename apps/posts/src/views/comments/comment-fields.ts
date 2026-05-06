import {DATE_FILTER_OPERATORS, DEFAULT_DATE_OPERATOR} from '../filters/filter-date';
import {dateCodec, scalarCodec, textCodec} from '../filters/filter-codecs';
import {defineFields} from '../filters/filter-types';
import {extractComparator} from '../filters/filter-ast';
import type {FilterCodec} from '../filters/filter-types';

const reportedCodec: FilterCodec = {
    parse(node, ctx) {
        const comparator = extractComparator(node as Record<string, unknown>);

        if (!comparator || comparator.field !== 'count.reports') {
            return null;
        }

        if (comparator.operator === '$eq' && comparator.value === 0) {
            return {
                field: ctx.key,
                operator: 'is',
                values: ['false']
            };
        }

        if (comparator.operator === '$gt' && comparator.value === 0) {
            return {
                field: ctx.key,
                operator: 'is',
                values: ['true']
            };
        }

        return null;
    },
    serialize(predicate) {
        const value = predicate.values[0];

        if (predicate.operator !== 'is') {
            return null;
        }

        if (value === 'true') {
            return ['count.reports:>0'];
        }

        if (value === 'false') {
            return ['count.reports:0'];
        }

        return null;
    }
};

export const commentFields = defineFields({
    status: {
        operators: ['is'],
        ui: {
            label: 'Status',
            type: 'select',
            searchable: false,
            hideOperatorSelect: true
        },
        options: [
            {value: 'published', label: 'Published'},
            {value: 'hidden', label: 'Hidden'}
        ],
        codec: scalarCodec()
    },
    created_at: {
        operators: DATE_FILTER_OPERATORS,
        ui: {
            label: 'Date',
            defaultOperator: DEFAULT_DATE_OPERATOR,
            type: 'date',
            className: 'w-full max-w-32'
        },
        codec: dateCodec()
    },
    body: {
        operators: ['contains', 'does-not-contain'],
        parseKeys: ['html'],
        ui: {
            label: 'Text',
            type: 'text',
            placeholder: 'Search comment text...',
            defaultOperator: 'contains',
            className: 'w-full max-w-48',
            popoverContentClassName: 'w-full max-w-48'
        },
        codec: textCodec({field: 'html'})
    },
    post: {
        operators: ['is', 'is-not'],
        parseKeys: ['post_id'],
        ui: {
            label: 'Post',
            type: 'select',
            searchable: true,
            className: 'w-full max-w-80',
            popoverContentClassName: 'w-full max-w-[calc(100vw-32px)] max-w-80'
        },
        codec: scalarCodec({field: 'post_id'})
    },
    author: {
        operators: ['is', 'is-not'],
        parseKeys: ['member_id'],
        ui: {
            label: 'Author',
            type: 'select',
            searchable: true,
            className: 'w-80',
            popoverContentClassName: 'w-80'
        },
        codec: scalarCodec({field: 'member_id'})
    },
    reported: {
        operators: ['is'],
        parseKeys: ['count.reports'],
        ui: {
            label: 'Reported',
            type: 'select',
            searchable: false,
            hideOperatorSelect: true
        },
        options: [
            {value: 'true', label: 'Yes'},
            {value: 'false', label: 'No'}
        ],
        codec: reportedCodec
    }
});
