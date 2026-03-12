import {extractComparator} from '../filters/filter-ast';
import {scalarCodec, textCodec} from '../filters/filter-codecs';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {defineFields} from '../filters/filter-types';
import type {FilterCodec} from '../filters/filter-types';

const commentDateCodec: FilterCodec = {
    parse(node, ctx) {
        const comparator = extractComparator(node as Record<string, unknown>);

        if (!comparator || comparator.field !== 'created_at') {
            return null;
        }

        if (typeof comparator.value !== 'string') {
            return null;
        }

        if (comparator.operator === '$lt') {
            return {
                field: ctx.key,
                operator: 'before',
                values: [comparator.value]
            };
        }

        if (comparator.operator === '$gt') {
            return {
                field: ctx.key,
                operator: 'after',
                values: [comparator.value]
            };
        }

        return null;
    },
    serialize(predicate, ctx) {
        const value = predicate.values[0];

        if (typeof value !== 'string' || !value) {
            return null;
        }

        if (predicate.operator === 'before') {
            return [`created_at:<'${value}'`];
        }

        if (predicate.operator === 'after') {
            return [`created_at:>'${value}'`];
        }

        if (predicate.operator === 'is') {
            const {start, end} = getDayBoundsInUtc(value, ctx.timezone);

            return [
                `created_at:>='${start}'`,
                `created_at:<='${end}'`
            ];
        }

        return null;
    }
};

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
    id: {
        operators: ['is'],
        ui: {
            label: 'ID',
            type: 'text',
            hidden: true
        },
        codec: scalarCodec()
    },
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
        operators: ['is', 'before', 'after'],
        ui: {
            label: 'Date',
            type: 'date',
            className: 'w-full max-w-32'
        },
        codec: commentDateCodec
    },
    body: {
        operators: ['contains', 'does-not-contain'],
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
