import {resolveField} from './resolve-field';
import type {Filter} from '@tryghost/shade';
import type {FilterField} from './filter-types';

const RESERVED_MULTIVALUE_CHARS = /[\[\],]/;

function splitOperatorAndValue(raw: string): {operator: string; value: string} | null {
    const separatorIndex = raw.indexOf(':');

    if (separatorIndex === -1) {
        return null;
    }

    const operator = raw.slice(0, separatorIndex);
    const value = raw.slice(separatorIndex + 1);

    if (!operator || !value) {
        return null;
    }

    return {operator, value};
}

function parseArrayValue(raw: string): string[] | null {
    if (!raw.startsWith('[') || !raw.endsWith(']')) {
        return null;
    }

    const inner = raw.slice(1, -1);

    if (!inner) {
        return [];
    }

    const values = inner.split(',');
    return values.every(Boolean) ? values : null;
}

function parseFilterValue(raw: string, field: FilterField): unknown[] | null {
    if (field.ui.type === 'multiselect') {
        const values = parseArrayValue(raw);
        return values && values.length > 0 ? values : null;
    }

    if (field.ui.type === 'number') {
        const value = Number(raw);
        return Number.isFinite(value) ? [value] : null;
    }

    return [raw];
}

function serializeFilterValue(filter: Filter, field: FilterField): string | null {
    if (!filter.values.length) {
        return null;
    }

    if (field.ui.type === 'multiselect') {
        const values = filter.values.map(value => String(value));

        if (values.some(value => !value || RESERVED_MULTIVALUE_CHARS.test(value))) {
            return null;
        }

        return values.length ? `[${values.join(',')}]` : null;
    }

    return String(filter.values[0]);
}

function getFilterCountsKey(field: string): string {
    return field;
}

export function parseBrowserFilters<TFields extends Record<string, FilterField>>(searchParams: URLSearchParams, fields: TFields): Filter[] {
    const counts = new Map<string, number>();
    const filters: Filter[] = [];

    for (const [key, rawValue] of searchParams.entries()) {
        const resolved = resolveField(fields, key, 'UTC', {allowParseKeys: false});

        if (!resolved) {
            continue;
        }

        const parsed = splitOperatorAndValue(rawValue);

        if (!parsed || !resolved.definition.operators.includes(parsed.operator)) {
            continue;
        }

        const values = parseFilterValue(parsed.value, resolved.definition);

        if (!values) {
            continue;
        }

        const countKey = getFilterCountsKey(resolved.context.key);
        const nextCount = (counts.get(countKey) ?? 0) + 1;
        counts.set(countKey, nextCount);

        filters.push({
            id: `${resolved.context.key}:${nextCount}`,
            field: resolved.context.key,
            operator: parsed.operator,
            values
        });
    }

    return filters;
}

export function replaceBrowserFiltersInSearchParams<TFields extends Record<string, FilterField>>(currentParams: URLSearchParams, filters: Filter[], fields: TFields): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of currentParams.entries()) {
        if (!resolveField(fields, key, 'UTC', {allowParseKeys: false})) {
            params.append(key, value);
        }
    }

    for (const filter of filters) {
        const resolved = resolveField(fields, filter.field, 'UTC', {allowParseKeys: false});

        if (!resolved || !resolved.definition.operators.includes(filter.operator)) {
            continue;
        }

        const serializedValue = serializeFilterValue(filter, resolved.definition);

        if (!serializedValue) {
            continue;
        }

        params.append(filter.field, `${filter.operator}:${serializedValue}`);
    }

    return params;
}
