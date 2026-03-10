import {canonicalizeFilter} from './canonical-filter';
import {isCommentField, isCommentOperatorForField} from './comment-fields';
import type {Filter} from '@tryghost/shade';

export function serializeCommentFilters(filters: Filter[]): string | undefined {
    const parts: string[] = [];

    for (const filter of filters) {
        if (!isCommentField(filter.field) || !isCommentOperatorForField(filter.field, filter.operator)) {
            continue;
        }

        if (!filter.values[0]) {
            continue;
        }

        switch (filter.field) {
        case 'id':
            parts.push(`id:'${filter.values[0]}'`);
            break;

        case 'status':
            parts.push(`status:${filter.values[0]}`);
            break;

        case 'created_at':
            if (filter.operator === 'before' && filter.values[0]) {
                parts.push(`created_at:<'${filter.values[0]}'`);
            } else if (filter.operator === 'after' && filter.values[0]) {
                parts.push(`created_at:>'${filter.values[0]}'`);
            } else if (filter.operator === 'is' && filter.values[0]) {
                const dateValue = String(filter.values[0]);
                const startOfDay = new Date(dateValue + 'T00:00:00').toISOString();
                const endOfDay = new Date(dateValue + 'T23:59:59.999').toISOString();

                parts.push(`created_at:>='${startOfDay}'+created_at:<='${endOfDay}'`);
            }
            break;

        case 'body': {
            const value = filter.values[0] as string;
            const escapedValue = value.replace(/'/g, '\\\'');

            if (filter.operator === 'contains') {
                parts.push(`html:~'${escapedValue}'`);
            } else if (filter.operator === 'not_contains') {
                parts.push(`html:-~'${escapedValue}'`);
            }
            break;
        }

        case 'post':
            if (filter.operator === 'is_not') {
                parts.push(`post_id:-${filter.values[0]}`);
            } else {
                parts.push(`post_id:${filter.values[0]}`);
            }
            break;

        case 'author':
            if (filter.operator === 'is_not') {
                parts.push(`member_id:-${filter.values[0]}`);
            } else {
                parts.push(`member_id:${filter.values[0]}`);
            }
            break;

        case 'reported':
            if (filter.values[0] === 'true') {
                parts.push('count.reports:>0');
            } else if (filter.values[0] === 'false') {
                parts.push('count.reports:0');
            }
            break;
        }
    }

    return canonicalizeFilter(parts);
}
