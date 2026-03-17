import moment from 'moment-timezone';
import {defineFields} from '../filters/filter-types';
import {escapeNqlString, getDayBoundsInUtc} from '../filters/filter-normalization';
import {numberNql, scalarNql, setNql, textNql} from '../filters/filter-nql';
import type {FilterFieldNql} from '../filters/filter-types';

const TEXT_OPERATORS = ['is', 'contains', 'does-not-contain', 'starts-with', 'ends-with'] as const;
const DATE_OPERATORS = ['is-less', 'is-or-less', 'is-greater', 'is-or-greater'] as const;
const NUMBER_OPERATORS = ['is', 'is-greater', 'is-or-greater', 'is-less', 'is-or-less'] as const;
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

function createActiveColumnMetadata(key: string, label: string, include?: string) {
    return {
        activeColumn: {
            key,
            label,
            ...(include ? {include} : {})
        }
    };
}

function createTextField(label: string, className: string) {
    return {
        operators: TEXT_OPERATORS,
        ui: {
            label,
            type: 'text' as const,
            placeholder: `Enter ${label.toLowerCase()}...`,
            defaultOperator: 'is',
            className
        },
        ...textNql()
    };
}

function createSetField(
    label: string,
    metadata?: {activeColumn?: {key: string; label: string; include?: string}},
    config: {
        quoteStrings?: boolean;
        serializeSingletonAsScalar?: boolean;
    } = {}
) {
    return {
        operators: SET_OPERATORS,
        ui: {
            label,
            type: 'multiselect' as const,
            searchable: true,
            className: 'w-64',
            defaultOperator: 'is-any'
        },
        ...(metadata ? {metadata} : {}),
        ...setNql({
            quoteStrings: config.quoteStrings,
            serializeSingletonAsScalar: config.serializeSingletonAsScalar
        })
    };
}

function createScalarSelectField(
    label: string,
    options?: Array<{value: string; label: string}>,
    config: {
        searchable?: boolean;
        placeholder?: string;
        className?: string;
        quoteStrings?: boolean;
        metadata?: {activeColumn?: {key: string; label: string; include?: string}};
    } = {}
) {
    return {
        operators: SCALAR_OPERATORS,
        ui: {
            label,
            type: 'select' as const,
            searchable: config.searchable ?? false,
            ...(config.placeholder ? {placeholder: config.placeholder} : {}),
            ...(config.className ? {className: config.className} : {})
        },
        ...(options ? {options} : {}),
        ...(config.metadata ? {metadata: config.metadata} : {}),
        ...scalarNql({quoteStrings: config.quoteStrings})
    };
}

function createDateField(label: string, metadata?: {activeColumn?: {key: string; label: string; include?: string}}) {
    return {
        operators: DATE_OPERATORS,
        ui: {
            label,
            type: 'date' as const,
            defaultOperator: 'is-or-less',
            className: 'w-40'
        },
        ...(metadata ? {metadata} : {}),
        ...memberDateNql
    };
}

function createNumberField(
    label: string,
    config: {
        max?: number;
        suffix?: string;
    } = {}
) {
    return {
        operators: NUMBER_OPERATORS,
        ui: {
            label,
            type: 'number' as const,
            defaultOperator: 'is',
            defaultValue: 0,
            min: 0,
            ...(config.max !== undefined ? {max: config.max} : {}),
            ...(config.suffix ? {suffix: config.suffix} : {}),
            className: 'w-24'
        },
        ...numberNql()
    };
}

function createEmailPostField(label: string) {
    return createScalarSelectField(label, undefined, {
        searchable: true,
        placeholder: 'Select an email...',
        className: 'w-64',
        quoteStrings: true
    });
}

function formatDateValue(value: unknown, timezone: string): string | null {
    if (typeof value !== 'string' || !value) {
        return null;
    }

    const parsed = moment.tz(value, moment.ISO_8601, true, timezone);

    if (!parsed.isValid()) {
        return null;
    }

    return parsed.format('YYYY-MM-DD');
}

const memberDateNql: FilterFieldNql = {
    fromNql(node, ctx) {
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
    toNql(filter, ctx) {
        const value = filter.values[0];

        if (typeof value !== 'string' || !value) {
            return null;
        }

        const {start, end} = getDayBoundsInUtc(value, ctx.timezone);

        switch (filter.operator) {
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

const subscribedNql: FilterFieldNql = {
    fromNql() {
        return null;
    },
    toNql(filter) {
        const value = filter.values[0];

        if (filter.operator !== 'is' && filter.operator !== 'is-not') {
            return null;
        }

        if (value === 'email-disabled') {
            return filter.operator === 'is'
                ? ['(email_disabled:1)']
                : ['(email_disabled:0)'];
        }

        if (value === 'subscribed') {
            return filter.operator === 'is'
                ? ['(subscribed:true+email_disabled:0)']
                : ['(subscribed:false,email_disabled:1)'];
        }

        if (value === 'unsubscribed') {
            return filter.operator === 'is'
                ? ['(subscribed:false+email_disabled:0)']
                : ['(subscribed:true,email_disabled:1)'];
        }

        return null;
    }
};

const newsletterNql: FilterFieldNql = {
    fromNql() {
        return null;
    },
    toNql(filter, ctx) {
        const slug = ctx.params.slug;
        const value = filter.values[0];

        if (!slug || filter.operator !== 'is') {
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

const feedbackNql: FilterFieldNql = {
    fromNql() {
        return null;
    },
    toNql(filter) {
        const postId = filter.values[0];

        if (typeof postId !== 'string' || !postId || (filter.operator !== '1' && filter.operator !== '0')) {
            return null;
        }

        return [`(feedback.post_id:${escapeNqlString(postId)}+feedback.score:${filter.operator})`];
    }
};

export const memberFields = defineFields({
    name: createTextField('Name', 'w-48'),
    email: createTextField('Email', 'w-64'),
    label: createSetField('Label', createActiveColumnMetadata('labels', 'Labels', 'labels')),
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
        ...subscribedNql
    },
    last_seen_at: createDateField('Last seen'),
    created_at: createDateField('Created'),
    signup: createScalarSelectField('Signed up on post/page', undefined, {
        searchable: true,
        placeholder: 'Select a post or page...',
        className: 'w-64',
        quoteStrings: true
    }),
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
        ...newsletterNql
    },
    tier_id: createSetField('Membership tier', createActiveColumnMetadata('tiers', 'Tiers', 'tiers')),
    status: createScalarSelectField('Member status', [
        {value: 'paid', label: 'Paid'},
        {value: 'free', label: 'Free'},
        {value: 'comped', label: 'Complimentary'}
    ]),
    'subscriptions.plan_interval': createScalarSelectField('Billing period', [
        {value: 'month', label: 'Monthly'},
        {value: 'year', label: 'Yearly'}
    ], {
        metadata: createActiveColumnMetadata('subscriptions.plan_interval', 'Billing period', 'subscriptions')
    }),
    'subscriptions.status': createScalarSelectField('Stripe subscription status', SUBSCRIPTION_STATUS_OPTIONS, {
        metadata: createActiveColumnMetadata('subscriptions.status', 'Subscription status', 'subscriptions')
    }),
    'subscriptions.start_date': createDateField(
        'Paid start date',
        createActiveColumnMetadata('subscriptions.start_date', 'Paid start date', 'subscriptions')
    ),
    'subscriptions.current_period_end': createDateField(
        'Next billing date',
        createActiveColumnMetadata('subscriptions.current_period_end', 'Next billing date', 'subscriptions')
    ),
    conversion: createScalarSelectField('Subscription started on post/page', undefined, {
        searchable: true,
        placeholder: 'Select a post or page...',
        className: 'w-64',
        quoteStrings: true
    }),
    email_count: createNumberField('Emails sent (all time)'),
    email_opened_count: createNumberField('Emails opened (all time)'),
    email_open_rate: createNumberField('Open rate (all time)', {max: 100, suffix: '%'}),
    'emails.post_id': createEmailPostField('Sent email'),
    'opened_emails.post_id': createEmailPostField('Opened email'),
    'clicked_links.post_id': createEmailPostField('Clicked email'),
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
        ...feedbackNql
    },
    offer_redemptions: createSetField(
        'Offer',
        createActiveColumnMetadata('offer_redemptions', 'Offer'),
        {
            quoteStrings: true,
            serializeSingletonAsScalar: true
        }
    )
});
