import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

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
export function buildMemberNqlFilter(filters: Filter[]): string | undefined {
    const parts: string[] = [];

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
            if (subscriptionStatus === 'subscribed') {
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
            if (subscriptionStatus === 'subscribed' || (operator === 'is' && subscriptionStatus !== 'unsubscribed')) {
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
            const dateValue = String(value);
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

    return parts.length ? parts.join('+') : undefined;
}

/**
 * Parse a filter value from URL format: "operator:value"
 * e.g., "is:paid", "contains:hello"
 */
function parseFilterValue(queryValue: string): {operator: string; value: string} | null {
    if (!queryValue) {
        return null;
    }

    const colonIndex = queryValue.indexOf(':');
    if (colonIndex <= 0) {
        return null;
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

    for (const [field, queryValue] of searchParams.entries()) {
        // Skip non-filter params
        if (field === 'search') {
            continue;
        }

        // Handle newsletter filters which have dynamic keys (e.g., newsletters.weekly-digest)
        const isNewsletterFilter = field.startsWith('newsletters.');

        if (!isNewsletterFilter && !MEMBER_FILTER_FIELDS.includes(field as MemberFilterField)) {
            continue;
        }

        if (!queryValue) {
            continue;
        }

        const parsed = parseFilterValue(queryValue);
        if (parsed) {
            const values = MULTISELECT_FIELDS.has(field)
                ? parsed.value.split(',')
                : [parsed.value];
            filters.push({
                id: field,
                field: field,
                operator: parsed.operator,
                values
            });
        }
    }

    return filters;
}

/**
 * Serialize filters to URL search params format
 */
function filtersToSearchParams(filters: Filter[], search?: string): URLSearchParams {
    const params = new URLSearchParams();

    for (const filter of filters) {
        if (filter.values[0] !== undefined) {
            const key = filter.field;
            const serializedValue = MULTISELECT_FIELDS.has(key) && filter.values.length > 1
                ? filter.values.map(v => String(v)).join(',')
                : String(filter.values[0]);
            const value = `${filter.operator}:${serializedValue}`;
            params.set(key, value);
        }
    }

    if (search) {
        params.set('search', search);
    }

    return params;
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
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => buildMemberNqlFilter(filters), [filters]);

    const isFiltered = filters.length > 0 || search.length > 0;

    return {filters, nql, search, setFilters, setSearch, clearFilters, isFiltered};
}
