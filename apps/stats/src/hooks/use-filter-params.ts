import {Filter} from '@tryghost/shade';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';

// Supported filter fields that can be synced to URL
const SUPPORTED_FILTER_FIELDS = [
    'audience',
    'post',
    'source',
    'location',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term'
] as const;

type SupportedFilterField = typeof SUPPORTED_FILTER_FIELDS[number];

// Special marker for empty string values in URL (e.g., "Direct" traffic)
const EMPTY_VALUE_MARKER = '__empty__';

/**
 * Serialize filters to URL search params format
 * Format: field=value or field=value1,value2 for multi-select
 * Empty strings are encoded as __empty__ to preserve them in URLs
 */
function filtersToSearchParams(filters: Filter[]): URLSearchParams {
    const params = new URLSearchParams();

    filters.forEach((filter) => {
        if (SUPPORTED_FILTER_FIELDS.includes(filter.field as SupportedFilterField)) {
            if (filter.values.length > 0) {
                // Join multiple values with comma, encoding empty strings
                const value = filter.values
                    .map(v => (v === '' ? EMPTY_VALUE_MARKER : String(v)))
                    .join(',');
                params.set(filter.field, value);
            }
        }
    });

    return params;
}

// Cache for filter IDs to ensure stable references across renders
const filterIdCache = new Map<string, string>();

function getStableFilterId(field: string): string {
    if (!filterIdCache.has(field)) {
        filterIdCache.set(field, `url-${field}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
    }
    return filterIdCache.get(field)!;
}

/**
 * Parse URL search params into Filter objects
 * Preserves the order of params as they appear in the URL
 */
function searchParamsToFilters(searchParams: URLSearchParams): Filter[] {
    const filters: Filter[] = [];
    const supportedSet = new Set<string>(SUPPORTED_FILTER_FIELDS);

    // Iterate in URL order to preserve the sequence filters were added
    searchParams.forEach((value, field) => {
        if (!supportedSet.has(field)) {
            return;
        }

        // Split by comma for multi-select values, decoding empty string marker
        const values = value.split(',')
            .map(v => (v === EMPTY_VALUE_MARKER ? '' : v));

        if (values.length > 0) {
            // Use appropriate operator based on field type
            const operator = field === 'audience' ? 'is any of' : 'is';
            // Use stable IDs for URL-parsed filters to prevent unnecessary re-renders
            filters.push({
                id: getStableFilterId(field),
                field,
                operator,
                values
            });
        }
    });

    return filters;
}

interface UseFilterParamsOptions {
    /** Called when filters change from URL */
    onFiltersChange?: (filters: Filter[]) => void;
}

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface UseFilterParamsReturn {
    /** Current filters parsed from URL */
    filters: Filter[];
    /** Update filters and sync to URL - supports functional updates like useState */
    setFilters: (action: SetFiltersAction) => void;
    /** Clear all filters from URL */
    clearFilters: () => void;
}

/**
 * Hook to sync filter state with URL query parameters
 * Enables bookmarking and sharing filtered views
 */
export function useFilterParams(options: UseFilterParamsOptions = {}): UseFilterParamsReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {onFiltersChange} = options;

    // Track if we're currently updating to prevent loops
    const isUpdating = useRef(false);

    // Parse filters from URL on mount and when URL changes
    const filters = useMemo(() => {
        return searchParamsToFilters(searchParams);
    }, [searchParams]);

    // Notify parent of filter changes from URL (initial load or external navigation)
    useEffect(() => {
        if (!isUpdating.current && onFiltersChange) {
            onFiltersChange(filters);
        }
    }, [filters, onFiltersChange]);

    // Update URL when filters change - supports functional updates like useState
    const setFilters = useCallback((action: SetFiltersAction) => {
        isUpdating.current = true;

        // Handle functional updates
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const newParams = filtersToSearchParams(newFilters);

        // Preserve any non-filter params (like tab, etc.)
        const currentParams = new URLSearchParams(searchParams);

        // Remove old filter params
        SUPPORTED_FILTER_FIELDS.forEach((field) => {
            currentParams.delete(field);
        });

        // Add new filter params
        newParams.forEach((value, key) => {
            currentParams.set(key, value);
        });

        // Update URL
        setSearchParams(currentParams, {replace: true});

        // Reset updating flag after a tick
        setTimeout(() => {
            isUpdating.current = false;
        }, 0);
    }, [filters, searchParams, setSearchParams]);

    // Clear all filter params from URL
    const clearFilters = useCallback(() => {
        isUpdating.current = true;

        const currentParams = new URLSearchParams(searchParams);

        // Remove all filter params
        SUPPORTED_FILTER_FIELDS.forEach((field) => {
            currentParams.delete(field);
        });

        setSearchParams(currentParams, {replace: true});

        setTimeout(() => {
            isUpdating.current = false;
        }, 0);
    }, [searchParams, setSearchParams]);

    return {
        filters,
        setFilters,
        clearFilters
    };
}

export default useFilterParams;
