import {Filter} from '@tryghost/shade/patterns';
import {combineNqlAndClauses} from '../../filters/filter-query-core';
import {getMemberFields} from '../member-fields';
import {hasTimezoneSensitiveMemberFilter, isPredicateEnabled, parseMemberFilterState, serializeMemberFilters} from '../member-filter-query';
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
    hasUnknownFilters: boolean;
}

interface ToSearchParamsOptions {
    baseSearchParams: URLSearchParams;
    filters: Filter[];
    unknownClauses: string[];
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

function getEnabledFilters(filters: Filter[], fields: MemberFields): Filter[] {
    return filters.filter(predicate => isPredicateEnabled(predicate, fields));
}

function buildFilterNql(filters: Filter[], unknownClauses: string[], timezone: string, fields: MemberFields): string | undefined {
    return combineNqlAndClauses([
        serializeMemberFilters(getEnabledFilters(filters, fields), timezone),
        ...unknownClauses
    ]);
}

function toSearchParams({baseSearchParams, filters, unknownClauses, search, timezone, fields}: ToSearchParamsOptions): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const filter = buildFilterNql(filters, unknownClauses, timezone, fields);

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

/**
 * Filter state for the members list, synced with the `filter`/`search` URL
 * params. NQL clauses the filter UI can't represent (unknown fields, OR
 * groups, operators the field map doesn't advertise) are preserved: they stay
 * in the URL and in `nql` alongside any chips the user edits, and are only
 * removed by `clearFilters`/`clearAll`.
 */
export function useMembersFilterState(timezone: string): UseMembersFilterStateReturn {
    const fields = useMemo(() => getMemberFields(), []);
    const [searchParams, setSearchParams] = useSearchParams();
    const lastWrittenQueryRef = useRef<string | null>(null);
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);

    const {predicates: parsedFilters, unknownClauses} = useMemo(() => {
        return parseMemberFilterState(filterParam, timezone, fields);
    }, [filterParam, timezone, fields]);
    const [filters, setDraftFilters] = useState<Filter[]>(parsedFilters);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const nql = useMemo(() => {
        return buildFilterNql(filters, unknownClauses, timezone, fields);
    }, [filters, unknownClauses, timezone, fields]);

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
            unknownClauses,
            search,
            timezone,
            fields
        });
        const nextQuery = nextParams.toString();

        if (nextQuery !== currentQuery) {
            lastWrittenQueryRef.current = nextQuery;
            setSearchParams(nextParams, {replace: true});
        }
    }, [currentQuery, filters, unknownClauses, search, searchParams, setSearchParams, timezone, fields]);

    const setFilters = useCallback((nextFilters: Filter[], setOptions: SetFiltersOptions = {}) => {
        const replace = setOptions.replace ?? true;
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: nextFilters,
            unknownClauses,
            search,
            timezone,
            fields
        });

        setDraftFilters(nextFilters);
        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [search, searchParams, setSearchParams, timezone, fields, unknownClauses]);

    const setSearch = useCallback((nextSearch: string, setOptions: SetFiltersOptions = {}) => {
        const replace = setOptions.replace ?? true;
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters,
            unknownClauses,
            search: nextSearch,
            timezone,
            fields
        });

        lastWrittenQueryRef.current = nextParams.toString();
        setSearchParams(nextParams, {replace});
    }, [filters, unknownClauses, searchParams, setSearchParams, timezone, fields]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            unknownClauses: [],
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
            unknownClauses: [],
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
        hasFilterOrSearch: Boolean(nql) || search.length > 0,
        hasUnknownFilters: unknownClauses.length > 0
    };
}
