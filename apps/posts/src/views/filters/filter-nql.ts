import {canonicalizeFilter} from './canonical-filter';
import {isCommentField, isCommentOperatorForField} from './comment-fields';
import {isMemberField, isMemberOperatorForField} from './member-fields';
import type {MemberPredicate} from './member-fields';
import type {Filter} from '@tryghost/shade';
import moment from 'moment-timezone';
import nql from '@tryghost/nql-lang';

function serializeFiltersToNql(filters: Filter[], serializeFilter: (filter: Filter) => string | undefined): string | undefined {
    const parts: string[] = [];

    for (const filter of filters) {
        const part = serializeFilter(filter);

        if (part) {
            parts.push(part);
        }
    }

    return canonicalizeFilter(parts);
}

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
        before: '<',
        after: '>',
        is_not: '-',
        is_any_of: '',
        is_none_of: '-',
        is_not_any_of: '-',
        greater_than: '>',
        less_than: '<',
        equals: '',
        not_equals: '-'
    };

    return relationMap[relation] ?? '';
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

    if (!isMemberField(field)) {
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

export function parseMemberNqlFilterParam(filterParam: string): Filter[] {
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

export function buildMemberNqlFilter(filters: Filter[], options: {timezone?: string} = {}): string | undefined {
    const timezone = options.timezone ?? 'Etc/UTC';

    return serializeFiltersToNql(filters, (filter) => {
        if (!isMemberField(filter.field) || !isMemberOperatorForField(filter.field, filter.operator)) {
            return undefined;
        }

        if (!filter.values[0] && filter.values[0] !== 0) {
            return undefined;
        }

        const field = filter.field;
        const operator = filter.operator;
        const value = filter.values[0];
        const relationStr = getFilterRelationOperator(operator);

        if (field.startsWith('newsletters.')) {
            const slug = field.replace('newsletters.', '');
            const subscriptionStatus = String(value);

            if (isSubscribedNewsletterFilter(operator, subscriptionStatus)) {
                return `(newsletters.slug:${slug}+email_disabled:0)`;
            }

            return `(newsletters.slug:-${slug},email_disabled:1)`;
        }

        switch (field) {
        case 'name':
        case 'email': {
            const escapedValue = escapeNqlString(String(value));
            return `${field}:${relationStr}${escapedValue}`;
        }

        case 'label':
        case 'tier_id':
        case 'offer_redemptions': {
            if (Array.isArray(filter.values) && filter.values.length > 0) {
                const filterValue = '[' + filter.values.join(',') + ']';
                return `${field}:${relationStr}${filterValue}`;
            }

            if (value) {
                return `${field}:${relationStr}${value}`;
            }

            return undefined;
        }

        case 'status':
            return `status:${relationStr}${value}`;

        case 'subscribed': {
            if (value === 'email-disabled') {
                return operator === 'is' ? '(email_disabled:1)' : '(email_disabled:0)';
            }

            if (operator === 'is' || operator === 'is_any_of') {
                return value === 'subscribed'
                    ? '(subscribed:true+email_disabled:0)'
                    : '(subscribed:false+email_disabled:0)';
            }

            return value === 'subscribed'
                ? '(subscribed:false,email_disabled:1)'
                : '(subscribed:true,email_disabled:1)';
        }

        case 'newsletters': {
            const [slug, subscriptionStatus] = String(value).split(':');

            if (isSubscribedNewsletterFilter(operator, subscriptionStatus)) {
                return `(newsletters.slug:${slug}+email_disabled:0)`;
            }

            return `(newsletters.slug:-${slug},email_disabled:1)`;
        }

        case 'last_seen_at':
        case 'created_at':
        case 'subscriptions.start_date':
        case 'subscriptions.current_period_end': {
            const dateValue = formatDateFilterValue(String(value), relationStr, timezone);
            return `${field}:${relationStr}'${dateValue}'`;
        }

        case 'email_count':
        case 'email_opened_count':
        case 'email_open_rate':
            return `${field}:${relationStr}${value}`;

        case 'subscriptions.plan_interval':
            return `subscriptions.plan_interval:${relationStr}${value}`;

        case 'subscriptions.status':
            return `subscriptions.status:${relationStr}${value}`;

        case 'signup':
        case 'conversion':
        case 'emails.post_id':
        case 'opened_emails.post_id':
        case 'clicked_links.post_id':
            return `${field}:${relationStr}'${value}'`;

        case 'newsletter_feedback': {
            const score = operator;
            return `(feedback.post_id:'${value}'+feedback.score:${score})`;
        }

        default:
            if (typeof value === 'string' && value.includes(' ')) {
                return `${field}:${relationStr}'${value}'`;
            }

            return `${field}:${relationStr}${value}`;
        }
    });
}

export function serializeMemberPredicates(predicates: MemberPredicate[]): string | undefined {
    return buildMemberNqlFilter(predicates as unknown as Filter[]);
}

export function serializeCommentFilters(filters: Filter[]): string | undefined {
    return serializeFiltersToNql(filters, (filter) => {
        if (!isCommentField(filter.field) || !isCommentOperatorForField(filter.field, filter.operator)) {
            return undefined;
        }

        if (!filter.values[0]) {
            return undefined;
        }

        switch (filter.field) {
        case 'id':
            return `id:'${filter.values[0]}'`;

        case 'status':
            return `status:${filter.values[0]}`;

        case 'created_at':
            if (filter.operator === 'before') {
                return `created_at:<'${filter.values[0]}'`;
            }

            if (filter.operator === 'after') {
                return `created_at:>'${filter.values[0]}'`;
            }

            if (filter.operator === 'is') {
                const dateValue = String(filter.values[0]);
                const startOfDay = new Date(dateValue + 'T00:00:00').toISOString();
                const endOfDay = new Date(dateValue + 'T23:59:59.999').toISOString();

                return `created_at:>='${startOfDay}'+created_at:<='${endOfDay}'`;
            }

            return undefined;

        case 'body': {
            const value = String(filter.values[0]).replace(/'/g, '\\\'');
            return filter.operator === 'contains'
                ? `html:~'${value}'`
                : `html:-~'${value}'`;
        }

        case 'post':
            return filter.operator === 'is_not'
                ? `post_id:-${filter.values[0]}`
                : `post_id:${filter.values[0]}`;

        case 'author':
            return filter.operator === 'is_not'
                ? `member_id:-${filter.values[0]}`
                : `member_id:${filter.values[0]}`;

        case 'reported':
            if (filter.values[0] === 'true') {
                return 'count.reports:>0';
            }

            if (filter.values[0] === 'false') {
                return 'count.reports:0';
            }

            return undefined;
        }
    });
}
