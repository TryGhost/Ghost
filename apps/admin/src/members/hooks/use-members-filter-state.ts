import {type Filter} from '@tryghost/shade/patterns';
import {buildMemberFields, canReadMemberFilter} from '@/members/member-filter-catalog';
import {hasTimezoneSensitiveMemberFilter, isPredicateEnabled, parseMemberFilter, serializeMemberFilters} from '@/members/member-filter-query';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {CustomFieldDefinition} from '@/members/custom-fields/filter-fields';
import type {MemberFields} from '@/members/member-filter-catalog';
import type {NewsletterDefinition} from '@/members/newsletter-filter-fields';

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

/** What a filter may depend on before it can be read for what it says. */
export interface MemberFilterPrerequisites {
    /** Settings carry the site timezone, which is what a date in a filter is relative to. */
    hasResolvedSettings: boolean;
    isLoadingSettings?: boolean;
    /** The site's own newsletters and custom fields. Undefined until they arrive. */
    newsletters?: readonly NewsletterDefinition[];
    customFields?: readonly CustomFieldDefinition[];
}

/**
 * Whether the page should wait before touching the filter at all.
 *
 * A filter can only be read for what it says once everything it leans on has arrived. The site's
 * timezone decides which day a date means; the site's own definitions decide that a custom field
 * holds dates rather than text. Read one early and the parts that cannot be understood yet are
 * simply not there, so the page answers a wider question than was asked — and, on the next write,
 * replaces what the publisher wrote with that wider version.
 *
 * The page therefore waits, rather than each place that reads or writes a filter remembering to
 * check. Waiting is only ever for what this particular filter names: one that mentions no
 * newsletter does not wait for newsletters, and one with no date does not wait for the timezone.
 */
export function shouldDelayMembersFilterHydration(
    filterParam: string | undefined,
    {
        hasResolvedSettings,
        isLoadingSettings = !hasResolvedSettings,
        newsletters,
        customFields
    }: MemberFilterPrerequisites
): boolean {
    if (!filterParam) {
        return false;
    }

    const waitingForTimezone = isLoadingSettings
        && !hasResolvedSettings
        && hasTimezoneSensitiveMemberFilter(filterParam);

    return waitingForTimezone || !canReadMemberFilter(filterParam, {newsletters, customFields});
}

function getEnabledFilters(filters: Filter[], fields: MemberFields): Filter[] {
    return filters.filter(predicate => isPredicateEnabled(predicate, fields));
}

function toSearchParams({baseSearchParams, filters, search, timezone, fields}: ToSearchParamsOptions): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const filter = serializeMemberFilters(getEnabledFilters(filters, fields), timezone, fields);

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

export function useMembersFilterState(
    timezone: string,
    newsletters?: readonly NewsletterDefinition[],
    customFields?: readonly CustomFieldDefinition[]
): UseMembersFilterStateReturn {
    const fields = useMemo(() => buildMemberFields({newsletters, customFields}), [newsletters, customFields]);
    const [searchParams, setSearchParams] = useSearchParams();
    const lastWrittenQueryRef = useRef<string | null>(null);
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);

    const parsedFilters = useMemo(() => {
        return getEnabledFilters(parseMemberFilter(filterParam, timezone, fields), fields);
    }, [filterParam, timezone, fields]);
    const [filters, setDraftFilters] = useState<Filter[]>(parsedFilters);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const nql = useMemo(() => {
        return serializeMemberFilters(getEnabledFilters(filters, fields), timezone, fields);
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
