import {commentFields} from '../comment-fields';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {parseCommentFilter, serializeCommentFilters} from '../comment-filter-query';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    replace?: boolean;
}

interface ClearFiltersOptions {
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: (options?: ClearFiltersOptions) => void;
    isSingleIdFilter: boolean;
}

function toSearchParams(filters: Filter[], timezone: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = serializeCommentFilters(filters, timezone);

    if (filter) {
        params.set('filter', filter);
    }

    return params;
}

function parseLegacyFilterValue(queryValue: string): {operator: string; value: string} | null {
    const colonIndex = queryValue.indexOf(':');

    if (colonIndex <= 0) {
        return null;
    }

    return {
        operator: queryValue.substring(0, colonIndex),
        value: queryValue.substring(colonIndex + 1)
    };
}

function parseLegacyFilters(searchParams: URLSearchParams): Filter[] {
    const validFields = new Set(Object.keys(commentFields));
    const filters: Filter[] = [];

    for (const [field, queryValue] of searchParams.entries()) {
        if (!validFields.has(field) || !queryValue) {
            continue;
        }

        const parsed = parseLegacyFilterValue(queryValue);

        if (!parsed) {
            continue;
        }

        filters.push({
            id: `${field}:${filters.length + 1}`,
            field,
            operator: parsed.operator,
            values: [parsed.value]
        });
    }

    return filters;
}

export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const timezone = useMemo(() => getSiteTimezone(settingsData?.settings ?? []), [settingsData?.settings]);

    const filters = useMemo(() => {
        const filter = searchParams.get('filter');

        if (filter !== null) {
            return parseCommentFilter(filter || undefined, timezone);
        }

        return parseLegacyFilters(searchParams);
    }, [searchParams, timezone]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(newFilters, timezone), {replace});
    }, [filters, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: ClearFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => serializeCommentFilters(filters, timezone), [filters, timezone]);

    const isSingleIdFilter = useMemo(() => {
        return filters.length === 1 && filters[0].field === 'id';
    }, [filters]);

    return {
        filters,
        nql,
        setFilters,
        clearFilters,
        isSingleIdFilter
    };
}
