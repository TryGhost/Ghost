import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

/**
 * Member filter field keys
 */
export const MEMBER_FILTER_FIELDS = ['status', 'label', 'tier'] as const;

export type MemberFilterField = (typeof MEMBER_FILTER_FIELDS)[number];

export function buildNqlFilter(filters: Filter[]): string | undefined {
    const parts: string[] = [];

    for (const filter of filters) {
        if (!filter.values[0]) {
            continue;
        }

        switch (filter.field) {
        case 'status':
            parts.push(`status:${filter.values[0]}`);
            break;
        case 'label':
            parts.push(`label:${filter.values[0]}`);
            break;
        case 'tier':
            parts.push(`tier:${filter.values[0]}`);
            break;
        }
    }

    return parts.length ? parts.join('+') : undefined;
}

/**
 * Parse a filter value from URL format: "operator:value"
 */
function parseFilterValue(
    queryValue: string
): { operator: string; value: string } | null {
    if (!queryValue) {
        return null;
    }

    const colonIndex = queryValue.indexOf(':');
    if (colonIndex <= 0) {
        return null; // Invalid format, must have operator:value
    }

    return {
        operator: queryValue.substring(0, colonIndex),
        value: queryValue.substring(colonIndex + 1)
    };
}

/**
 * Parse URL search params into Filter objects
 */
function searchParamsToFilters(searchParams: URLSearchParams): Filter[] {
    const filters: Filter[] = [];

    for (const field of MEMBER_FILTER_FIELDS) {
        const queryValue = searchParams.get(field);
        if (!queryValue) {
            continue;
        }

        const parsed = parseFilterValue(queryValue);
        if (parsed) {
            filters.push({
                id: field,
                field,
                operator: parsed.operator,
                values: [parsed.value]
            });
        }
    }

    return filters;
}

/**
 * Serialize filters to URL search params format
 */
function filtersToSearchParams(filters: Filter[]): URLSearchParams {
    const params = new URLSearchParams();

    for (const filter of filters) {
        if (
            MEMBER_FILTER_FIELDS.includes(filter.field as MemberFilterField) &&
            filter.values[0] !== undefined
        ) {
            const value = `${filter.operator}:${String(filter.values[0])}`;
            params.set(filter.field, value);
        }
    }

    return params;
}

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: () => void;
}

export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse filters from URL
    const filters = useMemo(() => {
        return searchParamsToFilters(searchParams);
    }, [searchParams]);

    // Update URL when filters change
    const setFilters = useCallback(
        (action: SetFiltersAction, options: SetFiltersOptions = {}) => {
            const newFilters =
                typeof action === 'function' ? action(filters) : action;
            const newParams = filtersToSearchParams(newFilters);

            // Update URL - replace by default, but allow pushing to history
            const replace = options.replace ?? true;
            setSearchParams(newParams, {replace});
        },
        [filters, setSearchParams]
    );

    // Clear all filter params from URL
    const clearFilters = useCallback(() => {
        setSearchParams(new URLSearchParams(), {replace: true});
    }, [setSearchParams]);

    const nql = useMemo(() => buildNqlFilter(filters), [filters]);

    return {filters, nql, setFilters, clearFilters};
}
