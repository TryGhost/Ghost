import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Filter} from '@tryghost/shade';
import {canonicalizeFilter} from '@src/views/filters/canonical-filter';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import moment from 'moment-timezone';
import nql from '@tryghost/nql-lang';

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

/**
 * Escape a string for NQL (escape single quotes)
 */
function escapeNqlString(value: string): string {
    return '\'' + value.replace(/'/g, '\\\'') + '\'';
}

function formatDateFilterValue(value: string, relation: string, timezone: string): string {
    const trimmedValue = value.trim();
    const localDate = moment.tz(trimmedValue, 'YYYY-MM-DD', true, timezone);

    if (!localDate.isValid()) {
        return trimmedValue;
    }

    const boundaryDate = (relation === '>' || relation === '<=')
        ? localDate.set({hour: 23, minute: 59, second: 59})
        : localDate.set({hour: 0, minute: 0, second: 0});

    return boundaryDate.utc().format('YYYY-MM-DD HH:mm:ss');
}

function normalizeNewsletterSubscriptionValue(value: string): 'true' | 'false' | string {
    if (value === 'subscribed') {
        return 'true';
    }

    if (value === 'unsubscribed') {
        return 'false';
    }

    return value;
}

function isSubscribedNewsletterFilter(operator: string, value: string): boolean {
    const normalizedValue = normalizeNewsletterSubscriptionValue(value);
    const isInverseOperator = operator === 'is-not' || operator === 'is_not';

    return (operator === 'is' && normalizedValue === 'true') || (isInverseOperator && normalizedValue === 'false');
}

/**
 * Map UI operator names to NQL operators
 */
function getFilterRelationOperator(relation: string): string {
    const relationMap: Record<string, string> = {
        'is-less': '<',
        'is-or-less': '<=',
        is: '',
        'is-not': '-',
        'is-greater': '>',
        'is-or-greater': '>=',
        contains: '~',
        'does-not-contain': '-~',
        not_contains: '-~',
        'starts-with': '~^',
        'ends-with': '~$',
        // Shade filter operators (mapped to our internal names)
        before: '<',
        after: '>',
        is_not: '-',
        is_any_of: '',
        is_not_any_of: '-',
        greater_than: '>',
        less_than: '<',
        equals: '',
        not_equals: '-'
    };

    return relationMap[relation] ?? '';
}

/**
 * Build NQL filter string from filter array
 */
export function buildMemberNqlFilter(filters: Filter[], options: {timezone?: string} = {}): string | undefined {
    const parts: string[] = [];
    const timezone = options.timezone ?? 'Etc/UTC';

    for (const filter of filters) {
        if (!filter.values[0] && filter.values[0] !== 0) {
            continue;
        }

        const field = filter.field;
        const operator = filter.operator;
        const value = filter.values[0];
        const relationStr = getFilterRelationOperator(operator);

        // Handle newsletter filters with dynamic keys (e.g., newsletters.weekly-digest)
        if (field.startsWith('newsletters.')) {
            const slug = field.replace('newsletters.', '');
            const subscriptionStatus = String(value);

            if (isSubscribedNewsletterFilter(operator, subscriptionStatus)) {
                parts.push(`(newsletters.slug:${slug}+email_disabled:0)`);
            } else {
                parts.push(`(newsletters.slug:-${slug},email_disabled:1)`);
            }
            continue;
        }

        switch (field) {
        // Text filters (name, email)
        case 'name':
        case 'email': {
            const escapedValue = escapeNqlString(String(value));
            parts.push(`${field}:${relationStr}${escapedValue}`);
            break;
        }

        // Array filters (label, tier_id, offer_redemptions)
        case 'label':
        case 'tier_id':
        case 'offer_redemptions': {
            if (Array.isArray(filter.values) && filter.values.length > 0) {
                const filterValue = '[' + filter.values.join(',') + ']';
                parts.push(`${field}:${relationStr}${filterValue}`);
            } else if (value) {
                parts.push(`${field}:${relationStr}${value}`);
            }
            break;
        }

        // Status filter
        case 'status': {
            parts.push(`status:${relationStr}${value}`);
            break;
        }

        // Subscribed filter (complex NQL)
        case 'subscribed': {
            if (value === 'email-disabled') {
                if (operator === 'is') {
                    parts.push('(email_disabled:1)');
                } else {
                    parts.push('(email_disabled:0)');
                }
            } else if (operator === 'is' || operator === 'is_any_of') {
                if (value === 'subscribed') {
                    parts.push('(subscribed:true+email_disabled:0)');
                } else {
                    parts.push('(subscribed:false+email_disabled:0)');
                }
            } else {
                // is-not
                if (value === 'subscribed') {
                    parts.push('(subscribed:false,email_disabled:1)');
                } else {
                    parts.push('(subscribed:true,email_disabled:1)');
                }
            }
            break;
        }

        // Newsletter filters (dynamic)
        case 'newsletters': {
            // Value format: "slug:subscribed" or "slug:unsubscribed"
            const [slug, subscriptionStatus] = String(value).split(':');

            if (isSubscribedNewsletterFilter(operator, subscriptionStatus)) {
                parts.push(`(newsletters.slug:${slug}+email_disabled:0)`);
            } else {
                parts.push(`(newsletters.slug:-${slug},email_disabled:1)`);
            }
            break;
        }

        // Date filters
        case 'last_seen_at':
        case 'created_at':
        case 'subscriptions.start_date':
        case 'subscriptions.current_period_end': {
            const dateValue = formatDateFilterValue(String(value), relationStr, timezone);
            parts.push(`${field}:${relationStr}'${dateValue}'`);
            break;
        }

        // Number filters
        case 'email_count':
        case 'email_opened_count':
        case 'email_open_rate': {
            parts.push(`${field}:${relationStr}${value}`);
            break;
        }

        // Subscription plan interval
        case 'subscriptions.plan_interval': {
            parts.push(`subscriptions.plan_interval:${relationStr}${value}`);
            break;
        }

        // Subscription status
        case 'subscriptions.status': {
            parts.push(`subscriptions.status:${relationStr}${value}`);
            break;
        }

        // Resource filters — value is a post/page ID
        case 'signup':
        case 'conversion':
        case 'emails.post_id':
        case 'opened_emails.post_id':
        case 'clicked_links.post_id': {
            parts.push(`${field}:${relationStr}'${value}'`);
            break;
        }

        // Audience feedback — operator is the score, value is the post ID
        case 'newsletter_feedback': {
            // NQL: (feedback.post_id:'<postId>'+feedback.score:<0or1>)
            const score = operator; // '1' = More like this, '0' = Less like this
            parts.push(`(feedback.post_id:'${value}'+feedback.score:${score})`);
            break;
        }

        default:
            // Generic fallback
            if (typeof value === 'string' && value.includes(' ')) {
                parts.push(`${field}:${relationStr}'${value}'`);
            } else {
                parts.push(`${field}:${relationStr}${value}`);
            }
        }
    }

    return canonicalizeFilter(parts);
}

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

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    setSearch: (search: string, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
    isFiltered: boolean;
}

/**
 * Hook to sync member filter state with URL query parameters
 *
 * URL format: ?status=is:paid&label=is:vip&search=john
 */
export function useMembersFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});

    // Parse filters from URL
    const filters = useMemo(() => {
        return searchParamsToFilters(searchParams);
    }, [searchParams]);

    // Get search from URL
    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    // Update URL when filters change
    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const currentSearch = searchParams.get('search') ?? undefined;
        const newParams = filtersToSearchParams(newFilters, currentSearch);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, searchParams, setSearchParams]);

    // Update URL when search changes
    const setSearch = useCallback((newSearch: string, options: SetFiltersOptions = {}) => {
        const newParams = filtersToSearchParams(filters, newSearch || undefined);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, setSearchParams]);

    // Clear all filter params from URL
    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(buildClearedFilterParams(searchParams), {replace});
    }, [searchParams, setSearchParams]);

    const siteTimezone = useMemo(() => {
        return getSiteTimezone(settingsData?.settings ?? []);
    }, [settingsData?.settings]);

    const nql = useMemo(() => buildMemberNqlFilter(filters, {timezone: siteTimezone}), [filters, siteTimezone]);

    const isFiltered = filters.length > 0 || search.length > 0;

    return {filters, nql, search, setFilters, setSearch, clearFilters, isFiltered};
}
