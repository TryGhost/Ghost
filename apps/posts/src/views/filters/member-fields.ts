const MEMBER_STATIC_FIELD_OPERATORS = {
    name: ['is', 'contains', 'does-not-contain', 'starts-with', 'ends-with', 'not_contains'],
    email: ['is', 'contains', 'does-not-contain', 'starts-with', 'ends-with', 'not_contains'],
    label: ['is_any_of', 'is_none_of', 'is_not_any_of', 'is-not', 'is_not'],
    subscribed: ['is', 'is-not', 'is_not', 'is_any_of'],
    newsletters: ['is', 'is-not', 'is_not'],
    last_seen_at: ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'before', 'after'],
    created_at: ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'before', 'after'],
    signup: ['is', 'is-not', 'is_not'],
    tier_id: ['is', 'is-not', 'is_not'],
    status: ['is', 'is-not', 'is_not'],
    'subscriptions.plan_interval': ['is', 'is-not', 'is_not'],
    'subscriptions.status': ['is', 'is-not', 'is_not'],
    'subscriptions.start_date': ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'before', 'after'],
    'subscriptions.current_period_end': ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'before', 'after'],
    conversion: ['is', 'is-not', 'is_not'],
    offer_redemptions: ['is', 'is-not', 'is_not', 'is_any_of'],
    email_count: ['is', 'is-greater', 'is-less', 'greater_than', 'less_than', 'equals', 'not_equals'],
    email_opened_count: ['is', 'is-greater', 'is-less', 'greater_than', 'less_than', 'equals', 'not_equals'],
    email_open_rate: ['is', 'is-greater', 'is-less', 'greater_than', 'less_than', 'equals', 'not_equals'],
    'emails.post_id': ['is', 'is-not', 'is_not'],
    'opened_emails.post_id': ['is', 'is-not', 'is_not'],
    'clicked_links.post_id': ['is', 'is-not', 'is_not'],
    newsletter_feedback: ['1', '0']
} as const;

const NEWSLETTER_FIELD_OPERATORS = ['is', 'is-not', 'is_not'] as const;

export const MEMBER_STATIC_FIELDS = Object.keys(MEMBER_STATIC_FIELD_OPERATORS) as Array<keyof typeof MEMBER_STATIC_FIELD_OPERATORS>;

type StaticMemberField = keyof typeof MEMBER_STATIC_FIELD_OPERATORS;
type NewsletterMemberField = `newsletters.${string}`;
type MemberMultiValueField = 'label' | 'offer_redemptions' | 'tier_id';
type MemberDateField = 'last_seen_at' | 'created_at' | 'subscriptions.start_date' | 'subscriptions.current_period_end';
type MemberNumberField = 'email_count' | 'email_opened_count' | 'email_open_rate';
type MemberStatusField = 'status';
type MemberSubscribedField = 'subscribed';
type MemberNewsletterAggregateField = 'newsletters';
type MemberPlanIntervalField = 'subscriptions.plan_interval';
type MemberSubscriptionStatusField = 'subscriptions.status';

type DateValue = `${number}-${number}-${number}`;
type MemberNumberValue = number;
type MemberStatusValue = 'paid' | 'free' | 'comped';
type MemberSubscribedValue = 'subscribed' | 'unsubscribed' | 'email-disabled';
type MemberNewsletterAggregateValue = `${string}:${'subscribed' | 'unsubscribed'}`;
type MemberNewsletterValue = 'subscribed' | 'unsubscribed';
type MemberPlanIntervalValue = 'month' | 'year';
type MemberSubscriptionStatusValue =
    | 'active'
    | 'trialing'
    | 'canceled'
    | 'unpaid'
    | 'past_due'
    | 'incomplete'
    | 'incomplete_expired';

export type MemberField = StaticMemberField | NewsletterMemberField;

type NewsletterMemberOperator = typeof NEWSLETTER_FIELD_OPERATORS[number];
type MemberPredicateValues<TField extends MemberField> =
    TField extends MemberMultiValueField ? [string, ...string[]]
        : TField extends MemberDateField ? [DateValue]
            : TField extends MemberNumberField ? [MemberNumberValue]
                : TField extends MemberStatusField ? [MemberStatusValue]
                    : TField extends MemberSubscribedField ? [MemberSubscribedValue]
                        : TField extends MemberNewsletterAggregateField ? [MemberNewsletterAggregateValue]
                            : TField extends NewsletterMemberField ? [MemberNewsletterValue]
                                : TField extends MemberPlanIntervalField ? [MemberPlanIntervalValue]
                                    : TField extends MemberSubscriptionStatusField ? [MemberSubscriptionStatusValue]
                                        : [string];

export type MemberOperator<TField extends MemberField> =
    TField extends NewsletterMemberField
        ? NewsletterMemberOperator
        : TField extends StaticMemberField
            ? (typeof MEMBER_STATIC_FIELD_OPERATORS)[TField][number]
            : never;

export interface MemberPredicate<TField extends MemberField = MemberField> {
    id: string;
    field: TField;
    operator: MemberOperator<TField>;
    values: MemberPredicateValues<TField>;
}

let predicateIdCounter = 0;

function getMemberFieldOperators(field: string): readonly string[] | undefined {
    if (field.startsWith('newsletters.')) {
        return NEWSLETTER_FIELD_OPERATORS;
    }

    if (field in MEMBER_STATIC_FIELD_OPERATORS) {
        return MEMBER_STATIC_FIELD_OPERATORS[field as StaticMemberField];
    }

    return undefined;
}

export function isMemberField(field: string): field is MemberField {
    return getMemberFieldOperators(field) !== undefined;
}

export function isMemberOperatorForField<TField extends MemberField>(
    field: TField,
    operator: string
): operator is MemberOperator<TField> {
    const operators = getMemberFieldOperators(field);

    return operators?.includes(operator) ?? false;
}

export function createMemberPredicate<TField extends MemberField>(
    field: TField,
    operator: MemberOperator<TField>,
    values: MemberPredicateValues<TField>
): MemberPredicate<TField> {
    if (!isMemberOperatorForField(field, operator)) {
        throw new Error(`Invalid operator "${operator}" for member field "${field}"`);
    }

    if (values.length === 0) {
        throw new Error('Member predicate requires at least one value');
    }

    predicateIdCounter += 1;

    return {
        id: `${field}-${predicateIdCounter}`,
        field,
        operator,
        values
    };
}
