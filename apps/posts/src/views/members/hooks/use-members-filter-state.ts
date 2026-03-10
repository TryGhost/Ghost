import {useMemo} from 'react';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Filter} from '@tryghost/shade';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';
import {buildMemberNqlFilter} from '@src/views/filters/member-nql';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {deriveMemberFilterMetadata, MemberFilterColumnMetadata} from './member-filter-metadata';
import nql from '@tryghost/nql-lang';

export {buildMemberNqlFilter};

/**
 * Member filter field keys - single source of truth for filter definitions
 */
export const MEMBER_FILTER_FIELDS = [
    // Basic filters
    'name',
    'email',
    'label',
    'subscribed',
    'last_seen_at',
    'created_at',
    'signup',
    // Newsletter filters (dynamic, prefixed with newsletters.slug:)
    'newsletters',
    // Subscription filters
    'tier_id',
    'status',
    'subscriptions.plan_interval',
    'subscriptions.status',
    'subscriptions.start_date',
    'subscriptions.current_period_end',
    'conversion',
    // Email filters
    'email_count',
    'email_opened_count',
    'email_open_rate',
    'emails.post_id',
    'opened_emails.post_id',
    'clicked_links.post_id',
    'newsletter_feedback',
    // Optional
    'offer_redemptions'
] as const;

export type MemberFilterField = typeof MEMBER_FILTER_FIELDS[number];

// Fields that support multiselect (comma-separated values in URL)
const MULTISELECT_FIELDS = new Set<string>(['label', 'offer_redemptions']);

function parseLegacySubscribedFilter(filterNode: Record<string, unknown>): Filter | undefined {
    const comparator = ('$and' in filterNode && Array.isArray(filterNode.$and))
        ? filterNode.$and
        : (('$or' in filterNode && Array.isArray(filterNode.$or)) ? filterNode.$or : undefined);

    if (!comparator || comparator.length !== 2) {
        if ('email_disabled' in filterNode) {
            return {
                id: 'subscribed-legacy',
                field: 'subscribed',
                operator: 'is',
                values: [filterNode.email_disabled ? 'email-disabled' : 'unsubscribed']
            };
        }

        return undefined;
    }

    const [subscriptionNode, emailDisabledNode] = comparator as Array<Record<string, unknown>>;

    if (!('subscribed' in subscriptionNode) || !('email_disabled' in emailDisabledNode)) {
        return undefined;
    }

    const usedOr = '$or' in filterNode;
    const subscribed = subscriptionNode.subscribed;

    if (typeof subscribed !== 'boolean') {
        return undefined;
    }

    return {
        id: 'subscribed-legacy',
        field: 'subscribed',
        operator: usedOr ? 'is-not' : 'is',
        values: [subscribed ? 'subscribed' : 'unsubscribed']
    };
}

function parseLegacyNewsletterFilter(filterNode: Record<string, unknown>): Filter | undefined {
    const comparator = ('$and' in filterNode && Array.isArray(filterNode.$and))
        ? filterNode.$and
        : (('$or' in filterNode && Array.isArray(filterNode.$or)) ? filterNode.$or : undefined);

    if (!comparator || comparator.length !== 2) {
        return undefined;
    }

    const [newsletterNode, emailDisabledNode] = comparator as Array<Record<string, unknown>>;

    if (!('newsletters.slug' in newsletterNode) || !('email_disabled' in emailDisabledNode)) {
        return undefined;
    }

    const usedOr = '$or' in filterNode;
    const rawSlug = newsletterNode['newsletters.slug'];

    if (typeof rawSlug !== 'string') {
        return undefined;
    }

    return {
        id: `newsletters.${rawSlug}-legacy`,
        field: `newsletters.${rawSlug}`,
        operator: usedOr ? 'is-not' : 'is',
        values: [usedOr ? 'unsubscribed' : 'subscribed']
    };
}

function parseLegacySimpleFilter(filterNode: Record<string, unknown>): Filter | undefined {
    const entries = Object.entries(filterNode);

    if (entries.length !== 1) {
        return undefined;
    }

    const [field, rawValue] = entries[0];
    const isNewsletterField = field.startsWith('newsletters.');

    if (!isNewsletterField && !MEMBER_FILTER_FIELDS.includes(field as MemberFilterField)) {
        return undefined;
    }

    if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        return {
            id: `${field}-legacy`,
            field,
            operator: 'is',
            values: [String(rawValue)]
        };
    }

    if (rawValue && typeof rawValue === 'object' && '$ne' in rawValue) {
        return {
            id: `${field}-legacy`,
            field,
            operator: 'is-not',
            values: [String(rawValue.$ne)]
        };
    }

    const dateOperators = [
        ['$lt', 'is-less'],
        ['$lte', 'is-or-less'],
        ['$gt', 'is-greater'],
        ['$gte', 'is-or-greater']
    ] as const;

    if (rawValue && typeof rawValue === 'object') {
        for (const [legacyOperator, operator] of dateOperators) {
            if (legacyOperator in rawValue) {
                return {
                    id: `${field}-legacy`,
                    field,
                    operator,
                    values: [String(rawValue[legacyOperator]).split(' ')[0]]
                };
            }
        }
    }

    if (rawValue && typeof rawValue === 'object' && '$in' in rawValue && Array.isArray(rawValue.$in)) {
        return {
            id: `${field}-legacy`,
            field,
            operator: 'is_any_of',
            values: rawValue.$in.map(value => String(value))
        };
    }

    if (rawValue && typeof rawValue === 'object' && '$nin' in rawValue && Array.isArray(rawValue.$nin)) {
        return {
            id: `${field}-legacy`,
            field,
            operator: 'is_not_any_of',
            values: rawValue.$nin.map(value => String(value))
        };
    }

    if (rawValue && typeof rawValue === 'object' && '$regex' in rawValue && rawValue.$regex instanceof RegExp) {
        const source = rawValue.$regex.source;

        if (source.startsWith('^')) {
            return {
                id: `${field}-legacy`,
                field,
                operator: 'starts-with',
                values: [source.slice(1)]
            };
        }

        if (source.endsWith('$')) {
            return {
                id: `${field}-legacy`,
                field,
                operator: 'ends-with',
                values: [source.slice(0, -1)]
            };
        }

        return {
            id: `${field}-legacy`,
            field,
            operator: 'contains',
            values: [source]
        };
    }

    if (rawValue && typeof rawValue === 'object' && '$not' in rawValue && rawValue.$not instanceof RegExp) {
        return {
            id: `${field}-legacy`,
            field,
            operator: 'does-not-contain',
            values: [rawValue.$not.source]
        };
    }

    return undefined;
}

function parseLegacyFilterParam(filterParam: string): Filter[] {
    try {
        const parsedFilter = nql.parse(filterParam) as Record<string, unknown>;
        const newsletterFilter = parseLegacyNewsletterFilter(parsedFilter);

        if (newsletterFilter) {
            return [newsletterFilter];
        }

        const subscribedFilter = parseLegacySubscribedFilter(parsedFilter);

        if (subscribedFilter) {
            return [subscribedFilter];
        }

        const simpleFilter = parseLegacySimpleFilter(parsedFilter);

        return simpleFilter ? [simpleFilter] : [];
    } catch {
        return [];
    }
}

/**
 * Parse URL search params into Filter objects
 */
export function searchParamsToFilters(searchParams: URLSearchParams): Filter[] {
    const predicateFilters = parsePredicateParams({
        params: searchParams,
        multiselectFields: MULTISELECT_FIELDS,
        ignoredFields: new Set(['search'])
    }).filter(({field}) => {
        const isNewsletterFilter = field.startsWith('newsletters.');
        return isNewsletterFilter || MEMBER_FILTER_FIELDS.includes(field as MemberFilterField);
    }).map(predicate => ({
        id: predicate.id,
        field: predicate.field,
        operator: predicate.operator,
        values: predicate.values
    }));

    const legacyFilters = searchParams.getAll('filter')
        .flatMap(filterParam => parseLegacyFilterParam(filterParam));

    return legacyFilters.length > 0 ? legacyFilters : predicateFilters;
}

/**
 * Serialize filters to URL search params format
 */
export function filtersToSearchParams(filters: Filter[], search?: string): URLSearchParams {
    const predicates = filters
        .filter((filter) => {
            if (MULTISELECT_FIELDS.has(filter.field)) {
                return true;
            }

            return filter.values[0] !== undefined;
        })
        .map((filter, index) => ({
            id: filter.id || `${filter.field}-${index + 1}`,
            field: filter.field,
            operator: filter.operator,
            values: filter.values.map(value => String(value))
        }));

    return serializePredicateParams({
        predicates,
        multiselectFields: MULTISELECT_FIELDS,
        search
    });
}

export function buildClearedFilterParams(searchParams: URLSearchParams): URLSearchParams {
    const clearedParams = new URLSearchParams();
    const search = searchParams.get('search');

    if (search?.trim()) {
        clearedParams.set('search', search);
    }

    return clearedParams;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (action: Filter[] | ((prevFilters: Filter[]) => Filter[]), options?: UrlFilterStateOptions) => void;
    setSearch: (search: string, options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
    hasFilters: boolean;
    hasSearch: boolean;
    hasFilterOrSearch: boolean;
    activeFields: string[];
    activeColumns: MemberFilterColumnMetadata[];
}

/**
 * Hook to sync member filter state with URL query parameters
 *
 * URL format: ?status=is:paid&label=is:vip&search=john
 */
export function useMembersFilterState(): UseFilterStateReturn {
    const {data: settingsData} = useBrowseSettings({});

    const siteTimezone = useMemo(() => {
        return getSiteTimezone(settingsData?.settings ?? []);
    }, [settingsData?.settings]);

    const {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        hasFilters,
        hasSearch,
        hasFilterOrSearch,
        activeFields,
        activeColumns
    } = useUrlFilterState({
        parseFilters: searchParamsToFilters,
        serializeFilters: filtersToSearchParams,
        clearSearchParams: buildClearedFilterParams,
        buildNql: currentFilters => buildMemberNqlFilter(currentFilters, {timezone: siteTimezone}),
        deriveState: ({filters: currentFilters, search: currentSearch}) => {
            const flags = deriveFilterFlags({
                predicates: currentFilters.map(filter => ({
                    id: filter.id || `${filter.field}-${filter.operator}`,
                    field: filter.field,
                    operator: filter.operator,
                    values: filter.values
                })),
                search: currentSearch
            });
            const metadata = deriveMemberFilterMetadata(currentFilters);

            return {
                ...flags,
                activeFields: metadata.activeFields,
                activeColumns: metadata.activeColumns
            };
        }
    });

    return {filters, nql, search, setFilters, setSearch, clearFilters, hasFilters, hasSearch, hasFilterOrSearch, activeFields, activeColumns};
}
