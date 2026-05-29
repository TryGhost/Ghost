import {Filter} from '@tryghost/shade/patterns';
import {getMemberFields} from '../member-fields';
import {hasTimezoneSensitiveMemberFilter, isPredicateEnabled, parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';
import type {MemberFields} from '../member-fields';

interface SetFiltersOptions {
    replace?: boolean;
}

interface UseMembersFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (filters: Filter[], options?: SetFiltersOptions) => void;
    setSearch: (search: string, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
    clearAll: (options?: SetFiltersOptions) => void;
    hasFilterOrSearch: boolean;
}

interface ToSearchParamsOptions {
    baseSearchParams: URLSearchParams;
    filters: Filter[];
    search: string;
    timezone: string;
    fields: MemberFields;
}

/**
 * Should the page hold off parsing the URL filter until more data is in?
 *
 * Parsing a date-sensitive filter needs the timezone from settings. If we parse
 * before it resolves, the writeback effect can round-trip the date in UTC
 * instead of site time.
 */
export function shouldDelayMembersDateFilterHydration(
    filterParam: string | undefined,
    hasResolvedDependencies: boolean,
    isLoadingDependencies: boolean = !hasResolvedDependencies
): boolean {
    return Boolean(filterParam) && isLoadingDependencies && !hasResolvedDependencies && hasTimezoneSensitiveMemberFilter(filterParam);
}

function toSearchParams({baseSearchParams, filters, search, timezone, fields}: ToSearchParamsOptions): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const enabled = filters.filter(predicate => isPredicateEnabled(predicate, fields));
    const filter = serializeMemberFilters(enabled, timezone);

    params.delete('filter');
    params.delete('search');

    if (filter) {
        params.set('filter', filter);
    }

    if (search) {
        params.set('search', search);
    }

    return params;
}

export function useMembersFilterState(timezone: string): UseMembersFilterStateReturn {
    const fields = useMemo(() => getMemberFields(), []);
    const [searchParams, setSearchParams] = useSearchParams();
    const lastWrittenQueryRef = useRef<string | null>(null);
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);

    const parsedFilters = useMemo(() => {
        return parseMemberFilter(filterParam, timezone).filter(predicate => isPredicateEnabled(predicate, fields));
    }, [filterParam, timezone, fields]);
    const [filters, setDraftFilters] = useState<Filter[]>(parsedFilters);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const nql = useMemo(() => {
        const enabled = filters.filter(predicate => isPredicateEnabled(predicate, fields));
        return serializeMemberFilters(enabled, timezone);
    }, [filters, timezone, fields]);

    useEffect(() => {
        if (currentQuery !== lastWrittenQueryRef.current) {
            setDraftFilters(parsedFilters);
            lastWrittenQueryRef.current = currentQuery;
        }
    }, [currentQuery, parsedFilters]);

    useEffect(() => {
        if (lastWrittenQueryRef.current !== null && currentQuery !== lastWrittenQueryRef.current) {
            return;
        }

        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters,
            search,
            timezone,
            fields
        });
        const nextQuery = nextParams.toString();

        if (nextQuery !== currentQuery) {
            lastWrittenQueryRef.current = nextQuery;
            setSearchParams(nextParams, {replace: true});
        }
    }, [currentQuery, filters, search, searchParams, setSearchParams, timezone, fields]);

    const setFilters = useCallback((nextFilters: Filter[], setOptions: SetFiltersOptions = {}) => {
        const replace = setOptions.replace ?? true;
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: nextFilters,
            search,
            timezone,
            fields
        });

        setDraftFilters(nextFilters);
        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [search, searchParams, setSearchParams, timezone, fields]);

    const setSearch = useCallback((nextSearch: string, setOptions: SetFiltersOptions = {}) => {
        const replace = setOptions.replace ?? true;
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters,
            search: nextSearch,
            timezone,
            fields
        });

        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [filters, searchParams, setSearchParams, timezone, fields]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            search,
            timezone,
            fields
        });

        setDraftFilters([]);
        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [search, searchParams, setSearchParams, timezone, fields]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            search: '',
            timezone,
            fields
        });

        setDraftFilters([]);
        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [searchParams, setSearchParams, timezone, fields]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: Boolean(nql) || search.length > 0
    };
}
