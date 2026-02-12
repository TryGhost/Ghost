import {FilterFieldConfig, FilterOption, LucideIcon} from '@tryghost/shade';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {Tier} from '@tryghost/admin-x-framework/api/tiers';
import {useMemo} from 'react';

export interface UseMembersFilterConfigOptions {
    labels?: Label[];
    tiers?: Tier[];
    newsletters?: Newsletter[];
    hasMultipleTiers?: boolean;
    paidMembersEnabled?: boolean;
    emailAnalyticsEnabled?: boolean;
    labelsOptions?: FilterOption[];
    tiersOptions?: FilterOption[];
    onLabelsSearchChange?: (search: string) => void;
    labelsSearchValue?: string;
    labelsLoading?: boolean;
    onTiersSearchChange?: (search: string) => void;
    tiersSearchValue?: string;
    tiersLoading?: boolean;
}

const STATUS_OPTIONS: FilterOption<string>[] = [
    {value: 'paid', label: 'Paid'},
    {value: 'free', label: 'Free'},
    {value: 'comped', label: 'Complimentary'}
];

const SUBSCRIBED_OPTIONS: FilterOption<string>[] = [
    {value: 'subscribed', label: 'Subscribed'},
    {value: 'unsubscribed', label: 'Unsubscribed'},
    {value: 'email-disabled', label: 'Email disabled'}
];

const PLAN_INTERVAL_OPTIONS: FilterOption<string>[] = [
    {value: 'month', label: 'Monthly'},
    {value: 'year', label: 'Yearly'}
];

const SUBSCRIPTION_STATUS_OPTIONS: FilterOption<string>[] = [
    {value: 'active', label: 'Active'},
    {value: 'canceled', label: 'Canceled'},
    {value: 'unpaid', label: 'Unpaid'},
    {value: 'past_due', label: 'Past due'},
    {value: 'trialing', label: 'Trialing'}
];

const AUDIENCE_FEEDBACK_OPTIONS: FilterOption<string>[] = [
    {value: '1', label: 'More like this'},
    {value: '0', label: 'Less like this'}
];

const IS_IS_NOT_OPERATORS = [
    {value: 'is', label: 'is'},
    {value: 'is-not', label: 'is not'}
];

const TEXT_OPERATORS = [
    {value: 'is', label: 'is'},
    {value: 'contains', label: 'contains'},
    {value: 'does-not-contain', label: 'does not contain'},
    {value: 'starts-with', label: 'starts with'},
    {value: 'ends-with', label: 'ends with'}
];

const DATE_OPERATORS = [
    {value: 'is-less', label: 'before'},
    {value: 'is-or-less', label: 'on or before'},
    {value: 'is-greater', label: 'after'},
    {value: 'is-or-greater', label: 'on or after'}
];

const NUMBER_OPERATORS = [
    {value: 'is', label: 'is'},
    {value: 'is-greater', label: 'is greater than'},
    {value: 'is-less', label: 'is less than'}
];

export function useMembersFilterConfig({
    labels = [],
    tiers = [],
    newsletters = [],
    hasMultipleTiers = false,
    paidMembersEnabled = false,
    emailAnalyticsEnabled = false,
    labelsOptions = [],
    tiersOptions = [],
    onLabelsSearchChange,
    labelsSearchValue,
    labelsLoading = false,
    onTiersSearchChange,
    tiersSearchValue,
    tiersLoading = false
}: UseMembersFilterConfigOptions): FilterFieldConfig[] {
    return useMemo(() => {
        const fields: FilterFieldConfig[] = [];

        // ===== BASIC FILTERS =====

        // Name filter
        fields.push({
            key: 'name',
            label: 'Name',
            type: 'text',
            icon: <LucideIcon.User className="size-4" />,
            placeholder: 'Enter name...',
            operators: TEXT_OPERATORS,
            defaultOperator: 'contains',
            className: 'w-48'
        });

        // Email filter
        fields.push({
            key: 'email',
            label: 'Email',
            type: 'text',
            icon: <LucideIcon.Mail className="size-4" />,
            placeholder: 'Enter email...',
            operators: TEXT_OPERATORS,
            defaultOperator: 'contains',
            className: 'w-64'
        });

        // Label filter
        if (labels.length > 0 || labelsOptions.length > 0) {
            fields.push({
                key: 'label',
                label: 'Label',
                type: 'select',
                icon: <LucideIcon.Tag className="size-4" />,
                options: labelsOptions.length > 0 ? labelsOptions : labels.map(l => ({
                    value: l.id,
                    label: l.name
                })),
                operators: IS_IS_NOT_OPERATORS,
                searchable: true,
                onSearchChange: onLabelsSearchChange,
                searchValue: labelsSearchValue,
                isLoading: labelsLoading,
                className: 'w-64'
            });
        }

        // Subscribed filter
        fields.push({
            key: 'subscribed',
            label: newsletters.length > 1 ? 'All newsletters' : 'Newsletter subscription',
            type: 'select',
            icon: <LucideIcon.Mail className="size-4" />,
            options: SUBSCRIBED_OPTIONS,
            operators: IS_IS_NOT_OPERATORS,
            searchable: false
        });

        // Last seen filter
        fields.push({
            key: 'last_seen_at',
            label: 'Last seen',
            type: 'date',
            icon: <LucideIcon.Eye className="size-4" />,
            operators: DATE_OPERATORS,
            defaultOperator: 'is-or-less',
            className: 'w-40'
        });

        // Created at filter
        fields.push({
            key: 'created_at',
            label: 'Created',
            type: 'date',
            icon: <LucideIcon.Calendar className="size-4" />,
            operators: DATE_OPERATORS,
            defaultOperator: 'is-or-less',
            className: 'w-40'
        });

        // ===== NEWSLETTER FILTERS (if multiple newsletters) =====
        if (newsletters.length > 1) {
            newsletters.forEach((newsletter) => {
                fields.push({
                    key: `newsletters.${newsletter.slug}`,
                    label: newsletter.name,
                    type: 'select',
                    icon: <LucideIcon.Newspaper className="size-4" />,
                    options: [
                        {value: 'subscribed', label: 'Subscribed'},
                        {value: 'unsubscribed', label: 'Unsubscribed'}
                    ],
                    operators: [{value: 'is', label: 'is'}],
                    searchable: false,
                    hideOperatorSelect: true,
                    groupLabel: 'Newsletters'
                });
            });
        }

        // ===== SUBSCRIPTION FILTERS (if paid members enabled) =====
        if (paidMembersEnabled) {
            // Tier filter (only if multiple tiers)
            if (hasMultipleTiers) {
                fields.push({
                    key: 'tier_id',
                    label: 'Membership tier',
                    type: 'select',
                    icon: <LucideIcon.CreditCard className="size-4" />,
                    options: tiersOptions.length > 0 ? tiersOptions : tiers.map(t => ({
                        value: t.id,
                        label: t.name
                    })),
                    operators: IS_IS_NOT_OPERATORS,
                    searchable: true,
                    onSearchChange: onTiersSearchChange,
                    searchValue: tiersSearchValue,
                    isLoading: tiersLoading,
                    className: 'w-64',
                    groupLabel: 'Subscription'
                });
            }

            // Member status filter
            fields.push({
                key: 'status',
                label: 'Member status',
                type: 'select',
                icon: <LucideIcon.UserCircle className="size-4" />,
                options: STATUS_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false,
                groupLabel: 'Subscription'
            });

            // Billing period filter
            fields.push({
                key: 'subscriptions.plan_interval',
                label: 'Billing period',
                type: 'select',
                icon: <LucideIcon.CalendarClock className="size-4" />,
                options: PLAN_INTERVAL_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false,
                groupLabel: 'Subscription'
            });

            // Subscription status filter
            fields.push({
                key: 'subscriptions.status',
                label: 'Subscription status',
                type: 'select',
                icon: <LucideIcon.CreditCard className="size-4" />,
                options: SUBSCRIPTION_STATUS_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false,
                groupLabel: 'Subscription'
            });

            // Subscription start date filter
            fields.push({
                key: 'subscriptions.start_date',
                label: 'Subscription start date',
                type: 'date',
                icon: <LucideIcon.CalendarPlus className="size-4" />,
                operators: DATE_OPERATORS,
                defaultOperator: 'is-or-greater',
                className: 'w-40',
                groupLabel: 'Subscription'
            });

            // Next billing date filter
            fields.push({
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                type: 'date',
                icon: <LucideIcon.CalendarArrowDown className="size-4" />,
                operators: DATE_OPERATORS,
                defaultOperator: 'is-or-less',
                className: 'w-40',
                groupLabel: 'Subscription'
            });
        }

        // ===== EMAIL FILTERS (if email analytics enabled) =====
        if (emailAnalyticsEnabled) {
            // Emails sent filter
            fields.push({
                key: 'email_count',
                label: 'Emails sent (all time)',
                type: 'number',
                icon: <LucideIcon.Send className="size-4" />,
                operators: NUMBER_OPERATORS,
                defaultOperator: 'is-greater',
                min: 0,
                className: 'w-24',
                groupLabel: 'Email'
            });

            // Emails opened filter
            fields.push({
                key: 'email_opened_count',
                label: 'Emails opened (all time)',
                type: 'number',
                icon: <LucideIcon.MailOpen className="size-4" />,
                operators: NUMBER_OPERATORS,
                defaultOperator: 'is-greater',
                min: 0,
                className: 'w-24',
                groupLabel: 'Email'
            });

            // Open rate filter
            fields.push({
                key: 'email_open_rate',
                label: 'Open rate (all time)',
                type: 'number',
                icon: <LucideIcon.Percent className="size-4" />,
                operators: NUMBER_OPERATORS,
                defaultOperator: 'is-greater',
                min: 0,
                max: 100,
                suffix: '%',
                className: 'w-24',
                groupLabel: 'Email'
            });

            // Audience feedback filter
            fields.push({
                key: 'audience_feedback',
                label: 'Audience feedback',
                type: 'select',
                icon: <LucideIcon.ThumbsUp className="size-4" />,
                options: AUDIENCE_FEEDBACK_OPTIONS,
                operators: [{value: 'is', label: 'is'}],
                searchable: false,
                hideOperatorSelect: true,
                groupLabel: 'Email'
            });
        }

        return fields;
    }, [
        labels,
        tiers,
        newsletters,
        hasMultipleTiers,
        paidMembersEnabled,
        emailAnalyticsEnabled,
        labelsOptions,
        tiersOptions,
        onLabelsSearchChange,
        labelsSearchValue,
        labelsLoading,
        onTiersSearchChange,
        tiersSearchValue,
        tiersLoading
    ]);
}
