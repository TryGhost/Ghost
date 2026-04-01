import moment from 'moment-timezone';
import {defineFields} from '../filters/filter-types';
import {extractComparator} from '../filters/filter-ast';
import {getDayBoundsInUtc} from '../filters/filter-normalization';
import {scalarCodec, textCodec} from '../filters/filter-codecs';
import type {FilterCodec} from '../filters/filter-types';

function formatCommentDateValue(value: unknown, timezone: string): string | null {
    if (typeof value !== 'string' || !value) {
        return null;
    }

    const parsed = moment.tz(value, [moment.ISO_8601, 'YYYY-MM-DD'], true, timezone);

    if (!parsed.isValid()) {
        return null;
    }

    return parsed.format('YYYY-MM-DD');
}

const commentDateCodec: FilterCodec = {
    parse(node, ctx) {
        const comparator = extractComparator(node as Record<string, unknown>);

        if (!comparator || comparator.field !== ctx.key) {
            return null;
        }

        const value = formatCommentDateValue(comparator.value, ctx.timezone);

        if (!value) {
            return null;
        }

        if (comparator.operator === '$lt') {
            return {
                field: ctx.key,
                operator: 'before',
                values: [value]
            };
        }

        if (comparator.operator === '$gt') {
            return {
                field: ctx.key,
                operator: 'after',
                values: [value]
            };
        }

        return null;
    },
    serialize(predicate, ctx) {
        const value = predicate.values[0];

        if (typeof value !== 'string' || !value) {
            return null;
        }

        const {start, end} = getDayBoundsInUtc(value, ctx.timezone);

        if (predicate.operator === 'before') {
            return [`${ctx.key}:<'${start}'`];
        }

        if (predicate.operator === 'after') {
            return [`${ctx.key}:>'${end}'`];
        }

        if (predicate.operator === 'is') {
            return [
                `${ctx.key}:>='${start}'`,
                `${ctx.key}:<='${end}'`
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
