import {canonicalizeFilter} from './canonical-filter';
import type {MemberPredicate} from './member-fields';
import type {Filter} from '@tryghost/shade';
import moment from 'moment-timezone';

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
        case 'name':
        case 'email': {
            const escapedValue = escapeNqlString(String(value));
            parts.push(`${field}:${relationStr}${escapedValue}`);
            break;
        }

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

        case 'status': {
            parts.push(`status:${relationStr}${value}`);
            break;
        }

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
                if (value === 'subscribed') {
                    parts.push('(subscribed:false,email_disabled:1)');
                } else {
                    parts.push('(subscribed:true,email_disabled:1)');
                }
            }
            break;
        }

        case 'newsletters': {
            const [slug, subscriptionStatus] = String(value).split(':');

            if (isSubscribedNewsletterFilter(operator, subscriptionStatus)) {
                parts.push(`(newsletters.slug:${slug}+email_disabled:0)`);
            } else {
                parts.push(`(newsletters.slug:-${slug},email_disabled:1)`);
            }
            break;
        }

        case 'last_seen_at':
        case 'created_at':
        case 'subscriptions.start_date':
        case 'subscriptions.current_period_end': {
            const dateValue = formatDateFilterValue(String(value), relationStr, timezone);
            parts.push(`${field}:${relationStr}'${dateValue}'`);
            break;
        }

        case 'email_count':
        case 'email_opened_count':
        case 'email_open_rate': {
            parts.push(`${field}:${relationStr}${value}`);
            break;
        }

        case 'subscriptions.plan_interval': {
            parts.push(`subscriptions.plan_interval:${relationStr}${value}`);
            break;
        }

        case 'subscriptions.status': {
            parts.push(`subscriptions.status:${relationStr}${value}`);
            break;
        }

        case 'signup':
        case 'conversion':
        case 'emails.post_id':
        case 'opened_emails.post_id':
        case 'clicked_links.post_id': {
            parts.push(`${field}:${relationStr}'${value}'`);
            break;
        }

        case 'newsletter_feedback': {
            const score = operator;
            parts.push(`(feedback.post_id:'${value}'+feedback.score:${score})`);
            break;
        }

        default:
            if (typeof value === 'string' && value.includes(' ')) {
                parts.push(`${field}:${relationStr}'${value}'`);
            } else {
                parts.push(`${field}:${relationStr}${value}`);
            }
        }
    }

    return canonicalizeFilter(parts);
}

export function serializeMemberPredicates(predicates: MemberPredicate[]): string | undefined {
    return buildMemberNqlFilter(predicates as unknown as Filter[]);
}
