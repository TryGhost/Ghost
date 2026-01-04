import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

/**
 * Comment filter field keys - single source of truth for filter definitions
 */
export const COMMENT_FILTER_FIELDS = ['status', 'created_at', 'body', 'post', 'author', 'reported'] as const;

export type CommentFilterField = typeof COMMENT_FILTER_FIELDS[number];

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

        case 'created_at': 
            if (filter.operator === 'before' && filter.values[0]) {
                parts.push(`created_at:<'${filter.values[0]}'`);
            } else if (filter.operator === 'after' && filter.values[0]) {
                parts.push(`created_at:>'${filter.values[0]}'`);
            } else if (filter.operator === 'is' && filter.values[0]) {
                // Match all items from the selected day in the user's timezone
                const dateValue = String(filter.values[0]); // Format: YYYY-MM-DD
                    
                // Create Date objects in user's local timezone, then convert to UTC
                const startOfDay = new Date(dateValue + 'T00:00:00').toISOString();
                const endOfDay = new Date(dateValue + 'T23:59:59.999').toISOString();
                    
                parts.push(`created_at:>='${startOfDay}'+created_at:<='${endOfDay}'`);
            }
            break;

        case 'body': 
            const value = filter.values[0] as string;
            // Escape single quotes in the value
            const escapedValue = value.replace(/'/g, '\\\'');
                    
            if (filter.operator === 'contains') {
                parts.push(`html:~'${escapedValue}'`);
            } else if (filter.operator === 'not_contains') {
                parts.push(`html:-~'${escapedValue}'`);
            }
            break;

        case 'post': 
            if (filter.operator === 'is_not') {
                parts.push(`post_id:-${filter.values[0]}`);
            } else {
                // Default to 'is' operator
                parts.push(`post_id:${filter.values[0]}`);
            }
            break;

        case 'author': 
            if (filter.operator === 'is_not') {
                parts.push(`member_id:-${filter.values[0]}`);
            } else {
                // Default to 'is' operator
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
    
    return parts.length ? parts.join('+') : undefined;
}
/**
 * Parse a filter value from URL format: "operator:value"
 * e.g., "is:published", "contains:hello"
 */
function parseFilterValue(queryValue: string): {operator: string; value: string} | null {
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

    for (const field of COMMENT_FILTER_FIELDS) {
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
        if (COMMENT_FILTER_FIELDS.includes(filter.field as CommentFilterField) && filter.values[0] !== undefined) {
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

/**
 * Hook to sync comment filter state with URL query parameters
 * 
 * URL format: ?status=is:published&author=is:member-id&body=contains:search+term
 */
export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse filters from URL
    const filters = useMemo(() => {
        return searchParamsToFilters(searchParams);
    }, [searchParams]);

    // Update URL when filters change
    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const newParams = filtersToSearchParams(newFilters);

        // Update URL - replace by default, but allow pushing to history
        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, setSearchParams]);

    // Clear all filter params from URL
    const clearFilters = useCallback(() => {
        setSearchParams(new URLSearchParams(), {replace: true});
    }, [setSearchParams]);

    const nql = useMemo(() => buildNqlFilter(filters), [filters]);

    return {filters, nql, setFilters, clearFilters};
}
