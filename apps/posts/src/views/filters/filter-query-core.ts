import {canonicalizeClauses} from './filter-normalization';
import {resolveField} from './resolve-field';
import type {Filter} from '@tryghost/shade';
import type {FilterField} from './filter-types';

export function serializePredicates<TFields extends Record<string, FilterField>>(filters: Filter[], fields: TFields, timezone: string): string | undefined {
    const clauses = filters.flatMap((filter) => {
        const resolved = resolveField(fields, filter.field, timezone);

        if (!resolved) {
            return [];
        }

        return resolved.definition.toNql(filter, resolved.context) ?? [];
    });

    if (!clauses.length) {
        return undefined;
    }

    return canonicalizeClauses(clauses).join('+');
}
