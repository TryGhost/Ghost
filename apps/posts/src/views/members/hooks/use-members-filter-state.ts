import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {parseFilterToAst} from '../../filters/filter-query-core';
import {parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router';
import type {AstNode} from '../../filters/filter-ast';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    replace?: boolean;
}

interface UseMembersFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    setSearch: (search: string, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
    clearAll: (options?: SetFiltersOptions) => void;
    hasFilterOrSearch: boolean;
}

function toSearchParams(filters: Filter[], search: string, timezone: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = serializeMemberFilters(filters, timezone);

    if (filter) {
        params.set('filter', filter);
    }

    if (search) {
        params.set('search', search);
    }

    return params;
}

function hasOrCompound(node: AstNode | undefined): boolean {
    if (!node) {
        return false;
    }

    if (Array.isArray(node.$or)) {
        return true;
    }

    if (Array.isArray(node.$and) && node.$and.some(child => hasOrCompound(child as AstNode))) {
        return true;
    }

    return Object.values(node).some((value) => {
        return value !== null && typeof value === 'object' && !Array.isArray(value) && hasOrCompound(value as AstNode);
    });
}

export function useMembersFilterState(): UseMembersFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const filterAst = useMemo(() => parseFilterToAst(filterParam ?? ''), [filterParam]);
    const resolvedTimezone = useMemo(() => {
        if (!settingsData) {
            return null;
        }

        return getSiteTimezone(settingsData.settings ?? []);
    }, [settingsData]);
    const timezone = resolvedTimezone ?? 'Etc/UTC';
    const shouldPreserveRawFilter = Boolean(filterParam) && (!resolvedTimezone || hasOrCompound(filterAst));

    const filters = useMemo(() => {
        return parseMemberFilter(filterParam, timezone);
    }, [filterParam, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(newFilters, search, timezone), {replace});
    }, [filters, search, setSearchParams, timezone]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        const params = new URLSearchParams();

        if (shouldPreserveRawFilter && filterParam) {
            params.set('filter', filterParam);
        } else {
            const filter = serializeMemberFilters(filters, timezone);

            if (filter) {
                params.set('filter', filter);
            }
        }

        if (nextSearch) {
            params.set('search', nextSearch);
        }

        setSearchParams(params, {replace});
    }, [filterParam, filters, setSearchParams, shouldPreserveRawFilter, timezone]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(toSearchParams([], search, timezone), {replace});
    }, [search, setSearchParams, timezone]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => {
        if (shouldPreserveRawFilter) {
            return filterParam;
        }

        return serializeMemberFilters(filters, timezone);
    }, [filterParam, filters, shouldPreserveRawFilter, timezone]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: Boolean(filterParam) || search.length > 0
    };
}
