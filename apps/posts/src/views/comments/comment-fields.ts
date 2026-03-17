import {defineFields} from '../filters/filter-types';
import {extractComparator} from '../filters/filter-ast';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {scalarNql, textNql} from '../filters/filter-nql';
import type {FilterFieldNql} from '../filters/filter-types';

const commentDateNql: FilterFieldNql = {
    fromNql(node, ctx) {
        const comparator = extractComparator(node as Record<string, unknown>);

        if (!comparator || comparator.field !== ctx.key) {
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
    toNql(filter, ctx) {
        const value = filter.values[0];

        if (typeof value !== 'string' || !value) {
            return null;
        }

        if (filter.operator === 'before') {
            return [`${ctx.key}:<'${value}'`];
        }

        if (filter.operator === 'after') {
            return [`${ctx.key}:>'${value}'`];
        }

        if (filter.operator === 'is') {
            const {start, end} = getDayBoundsInUtc(value, ctx.timezone);

            return [
                `${ctx.key}:>='${start}'`,
                `${ctx.key}:<='${end}'`
            ];
        }

        return null;
    }
};

const reportedNql: FilterFieldNql = {
    fromNql(node, ctx) {
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
    toNql(filter) {
        const value = filter.values[0];

        if (filter.operator !== 'is') {
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
        ...scalarNql()
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
        ...scalarNql()
    },
    created_at: {
        operators: ['is', 'before', 'after'],
        ui: {
            label: 'Date',
            type: 'date',
            className: 'w-full max-w-32'
        },
        ...commentDateNql
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
        ...textNql({field: 'html'})
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
        ...scalarNql({field: 'post_id'})
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
        ...scalarNql({field: 'member_id'})
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
        ...reportedNql
    }
});
