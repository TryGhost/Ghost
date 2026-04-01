import moment from 'moment-timezone';
import {defineFields} from '../filters/filter-types';
import {escapeNqlString, getDayBoundsInUtc} from '../filters/filter-normalization';
import {numberCodec, scalarCodec, setCodec, textCodec} from '../filters/filter-codecs';
import type {FilterCodec} from '../filters/filter-types';

const TEXT_OPERATORS = ['is', 'contains', 'does-not-contain', 'starts-with', 'ends-with'] as const;
const DATE_OPERATORS = ['is-less', 'is-or-less', 'is-greater', 'is-or-greater'] as const;
const NUMBER_OPERATORS = ['is', 'is-greater', 'is-less'] as const;
const SCALAR_OPERATORS = ['is', 'is-not'] as const;
const SET_OPERATORS = ['is-any', 'is-not-any'] as const;
const SUBSCRIPTION_STATUS_OPTIONS: Array<{value: string; label: string}> = [
    {value: 'active', label: 'Active'},
    {value: 'trialing', label: 'Trialing'},
    {value: 'canceled', label: 'Canceled'},
    {value: 'unpaid', label: 'Unpaid'},
    {value: 'past_due', label: 'Past Due'},
    {value: 'incomplete', label: 'Incomplete'},
    {value: 'incomplete_expired', label: 'Incomplete - Expired'}
];

function formatDateValue(value: unknown, timezone: string): string | null {
    if (typeof value !== 'string' || !value) {
        return null;
    }

    const legacyUtc = moment.utc(value, ['YYYY-MM-DD HH:mm:ss.SSS', 'YYYY-MM-DD HH:mm:ss'], true);

    if (legacyUtc.isValid()) {
        return legacyUtc.tz(timezone).format('YYYY-MM-DD');
    }

    const parsed = moment.tz(value, moment.ISO_8601, true, timezone);

    if (!parsed.isValid()) {
        return null;
    }

    return parsed.format('YYYY-MM-DD');
}

const memberDateCodec: FilterCodec = {
    parse(node, ctx) {
        const entry = Object.entries(node as Record<string, unknown>)[0];

        if (!entry || entry[0] !== ctx.key || typeof entry[1] !== 'object' || entry[1] === null) {
            return null;
        }

        const [operator, rawValue] = Object.entries(entry[1] as Record<string, unknown>)[0] ?? [];
        const value = formatDateValue(rawValue, ctx.timezone);

        if (!value) {
            return null;
        }

        switch (operator) {
        case '$lt':
            return {field: ctx.key, operator: 'is-less', values: [value]};
        case '$lte':
            return {field: ctx.key, operator: 'is-or-less', values: [value]};
        case '$gt':
            return {field: ctx.key, operator: 'is-greater', values: [value]};
        case '$gte':
            return {field: ctx.key, operator: 'is-or-greater', values: [value]};
        default:
            return null;
        }
    },
    serialize(predicate, ctx) {
        const value = predicate.values[0];

        if (typeof value !== 'string' || !value) {
            return null;
        }

        const {start, end} = getDayBoundsInUtc(value, ctx.timezone);

        switch (predicate.operator) {
        case 'is-less':
            return [`${ctx.key}:<'${start}'`];
        case 'is-or-less':
            return [`${ctx.key}:<='${end}'`];
        case 'is-greater':
            return [`${ctx.key}:>'${end}'`];
        case 'is-or-greater':
            return [`${ctx.key}:>='${start}'`];
        default:
            return null;
        }
    }
};

const subscribedCodec: FilterCodec = {
    parse() {
        return null;
    },
    serialize(predicate) {
        const value = predicate.values[0];

        if (predicate.operator !== 'is' && predicate.operator !== 'is-not') {
            return null;
        }

        if (value === 'email-disabled') {
            return predicate.operator === 'is'
                ? ['(email_disabled:1)']
                : ['(email_disabled:0)'];
        }

        if (value === 'subscribed') {
            return predicate.operator === 'is'
                ? ['(subscribed:true+email_disabled:0)']
                : ['(subscribed:false,email_disabled:1)'];
        }

        if (value === 'unsubscribed') {
            return predicate.operator === 'is'
                ? ['(subscribed:false+email_disabled:0)']
                : ['(subscribed:true,email_disabled:1)'];
        }

        return null;
    }
};

const newsletterCodec: FilterCodec = {
    parse() {
        return null;
    },
    serialize(predicate, ctx) {
        const slug = ctx.params.slug;
        const value = predicate.values[0];

        if (!slug || predicate.operator !== 'is') {
            return null;
        }

        if (value === 'subscribed') {
            return [`(newsletters.slug:${slug}+email_disabled:0)`];
        }

        if (value === 'unsubscribed') {
            return [`(newsletters.slug:-${slug},email_disabled:1)`];
        }

        return null;
    }
};

const feedbackCodec: FilterCodec = {
    parse() {
        return null;
    },
    serialize(predicate) {
        const postId = predicate.values[0];

        if (typeof postId !== 'string' || !postId || (predicate.operator !== '1' && predicate.operator !== '0')) {
            return null;
        }

        return [`(feedback.post_id:${escapeNqlString(postId)}+feedback.score:${predicate.operator})`];
    }
};

export const memberFields = defineFields({
    name: {
        operators: TEXT_OPERATORS,
        ui: {
            label: 'Name',
            type: 'text',
            placeholder: 'Enter name...',
            defaultOperator: 'contains',
            className: 'w-48'
        },
        codec: textCodec()
    },
    email: {
        operators: TEXT_OPERATORS,
        ui: {
            label: 'Email',
            type: 'text',
            placeholder: 'Enter email...',
            defaultOperator: 'contains',
            className: 'w-48'
        },
        codec: textCodec()
    },
    label: {
        operators: SET_OPERATORS,
        ui: {
            label: 'Label',
            type: 'multiselect',
            searchable: true,
            className: 'w-64',
            defaultOperator: 'is-any'
        },
        metadata: {
            activeColumn: {
                key: 'labels',
                label: 'Labels',
                include: 'labels'
            }
        },
        codec: setCodec()
    },
    subscribed: {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Newsletter subscription',
            type: 'select',
            searchable: false
        },
        options: [
            {value: 'subscribed', label: 'Subscribed'},
            {value: 'unsubscribed', label: 'Unsubscribed'},
            {value: 'email-disabled', label: 'Email disabled'}
        ],
        codec: subscribedCodec
    },
    last_seen_at: {
        operators: DATE_OPERATORS,
        ui: {
            label: 'Last seen',
            type: 'date',
            defaultOperator: 'is-or-less',
            className: 'w-40'
        },
        codec: memberDateCodec
    },
    created_at: {
        operators: DATE_OPERATORS,
        ui: {
            label: 'Created',
            type: 'date',
            defaultOperator: 'is-or-less',
            className: 'w-40'
        },
        codec: memberDateCodec
    },
    signup: {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Signed up on post/page',
            type: 'select',
            searchable: true,
            placeholder: 'Select a post or page...',
            className: 'w-64'
        },
        codec: scalarCodec({quoteStrings: true})
    },
    'newsletters.:slug': {
        operators: ['is'],
        ui: {
            label: 'Newsletter',
            type: 'select',
            searchable: false,
            hideOperatorSelect: true
        },
        options: [
            {value: 'subscribed', label: 'Subscribed'},
            {value: 'unsubscribed', label: 'Unsubscribed'}
        ],
        codec: newsletterCodec
    },
    tier_id: {
        operators: SET_OPERATORS,
        ui: {
            label: 'Membership tier',
            type: 'multiselect',
            searchable: true,
            className: 'w-64',
            defaultOperator: 'is-any'
        },
        metadata: {
            activeColumn: {
                key: 'tiers',
                label: 'Tiers',
                include: 'tiers'
            }
        },
        codec: setCodec()
    },
    status: {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Member status',
            type: 'select',
            searchable: false
        },
        options: [
            {value: 'paid', label: 'Paid'},
            {value: 'free', label: 'Free'},
            {value: 'comped', label: 'Complimentary'}
        ],
        codec: scalarCodec()
    },
    'subscriptions.plan_interval': {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Billing period',
            type: 'select',
            searchable: false
        },
        options: [
            {value: 'month', label: 'Monthly'},
            {value: 'year', label: 'Yearly'}
        ],
        metadata: {
            activeColumn: {
                key: 'subscriptions.plan_interval',
                label: 'Billing period',
                include: 'subscriptions'
            }
        },
        codec: scalarCodec()
    },
    'subscriptions.status': {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Stripe subscription status',
            type: 'select',
            searchable: false
        },
        options: SUBSCRIPTION_STATUS_OPTIONS,
        metadata: {
            activeColumn: {
                key: 'subscriptions.status',
                label: 'Subscription status',
                include: 'subscriptions'
            }
        },
        codec: scalarCodec()
    },
    'subscriptions.start_date': {
        operators: DATE_OPERATORS,
        ui: {
            label: 'Paid start date',
            type: 'date',
            defaultOperator: 'is-or-less',
            className: 'w-40'
        },
        metadata: {
            activeColumn: {
                key: 'subscriptions.start_date',
                label: 'Paid start date',
                include: 'subscriptions'
            }
        },
        codec: memberDateCodec
    },
    'subscriptions.current_period_end': {
        operators: DATE_OPERATORS,
        ui: {
            label: 'Next billing date',
            type: 'date',
            defaultOperator: 'is-or-less',
            className: 'w-40'
        },
        metadata: {
            activeColumn: {
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                include: 'subscriptions'
            }
        },
        codec: memberDateCodec
    },
    conversion: {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Subscription started on post/page',
            type: 'select',
            searchable: true,
            placeholder: 'Select a post or page...',
            className: 'w-64'
        },
        codec: scalarCodec({quoteStrings: true})
    },
    email_count: {
        operators: NUMBER_OPERATORS,
        ui: {
            label: 'Emails sent (all time)',
            type: 'number',
            defaultOperator: 'is',
            defaultValue: 0,
            min: 0,
            className: 'w-24'
        },
        codec: numberCodec()
    },
    email_opened_count: {
        operators: NUMBER_OPERATORS,
        ui: {
            label: 'Emails opened (all time)',
            type: 'number',
            defaultOperator: 'is',
            defaultValue: 0,
            min: 0,
            className: 'w-24'
        },
        codec: numberCodec()
    },
    email_open_rate: {
        operators: NUMBER_OPERATORS,
        ui: {
            label: 'Open rate (all time)',
            type: 'number',
            defaultOperator: 'is',
            defaultValue: 0,
            min: 0,
            max: 100,
            suffix: '%',
            className: 'w-24'
        },
        codec: numberCodec()
    },
    'emails.post_id': {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Sent email',
            type: 'select',
            searchable: true,
            placeholder: 'Select an email...',
            className: 'w-64'
        },
        codec: scalarCodec({quoteStrings: true})
    },
    'opened_emails.post_id': {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Opened email',
            type: 'select',
            searchable: true,
            placeholder: 'Select an email...',
            className: 'w-64'
        },
        codec: scalarCodec({quoteStrings: true})
    },
    'clicked_links.post_id': {
        operators: SCALAR_OPERATORS,
        ui: {
            label: 'Clicked email',
            type: 'select',
            searchable: true,
            placeholder: 'Select an email...',
            className: 'w-64'
        },
        codec: scalarCodec({quoteStrings: true})
    },
    newsletter_feedback: {
        operators: ['1', '0'],
        ui: {
            label: 'Responded with feedback',
            type: 'select',
            searchable: true,
            placeholder: 'Select an email...',
            className: 'w-64',
            defaultOperator: '1'
        },
        codec: feedbackCodec
    },
    offer_redemptions: {
        operators: SET_OPERATORS,
        ui: {
            label: 'Offer',
            type: 'multiselect',
            searchable: true,
            className: 'w-64',
            defaultOperator: 'is-any'
        },
        metadata: {
            activeColumn: {
                key: 'offer_redemptions',
                label: 'Offer'
            }
        },
        codec: setCodec({quoteStrings: true, serializeSingletonAsScalar: true})
    }
});
