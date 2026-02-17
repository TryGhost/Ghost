import {FilterFieldConfig, FilterFieldGroup, FilterOption, LucideIcon} from '@tryghost/shade';
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
    // Resource search for post-type filters (signup, conversion)
    postResourceOptions?: FilterOption[];
    onPostResourceSearchChange?: (search: string) => void;
    postResourceSearchValue?: string;
    postResourceLoading?: boolean;
    // Resource search for email-type filters (sent/opened/clicked email, feedback)
    emailResourceOptions?: FilterOption[];
    onEmailResourceSearchChange?: (search: string) => void;
    emailResourceSearchValue?: string;
    emailResourceLoading?: boolean;
    // Feature/setting flags for resource filters
    membersTrackSources?: boolean;
    emailTrackOpens?: boolean;
    emailTrackClicks?: boolean;
    audienceFeedbackEnabled?: boolean;
    siteTimezone?: string;
}

const STATUS_OPTIONS: FilterOption<string>[] = [
    {value: 'paid', label: 'Paid'},
    {value: 'free', label: 'Free'},
    {value: 'comped', label: 'Complimentary'}
];

const SUBSCRIBED_OPTIONS_SINGLE: FilterOption<string>[] = [
    {value: 'subscribed', label: 'Subscribed'},
    {value: 'unsubscribed', label: 'Unsubscribed'},
    {value: 'email-disabled', label: 'Email disabled'}
];

const SUBSCRIBED_OPTIONS_MULTIPLE: FilterOption<string>[] = [
    {value: 'subscribed', label: 'Subscribed to at least one'},
    {value: 'unsubscribed', label: 'Unsubscribed from all'},
    {value: 'email-disabled', label: 'Email disabled'}
];

const PLAN_INTERVAL_OPTIONS: FilterOption<string>[] = [
    {value: 'month', label: 'Monthly'},
    {value: 'year', label: 'Yearly'}
];

const SUBSCRIPTION_STATUS_OPTIONS: FilterOption<string>[] = [
    {value: 'active', label: 'Active'},
    {value: 'trialing', label: 'Trialing'},
    {value: 'canceled', label: 'Canceled'},
    {value: 'unpaid', label: 'Unpaid'},
    {value: 'past_due', label: 'Past Due'},
    {value: 'incomplete', label: 'Incomplete'},
    {value: 'incomplete_expired', label: 'Incomplete - Expired'}
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

const AUDIENCE_FEEDBACK_OPERATORS = [
    {value: '1', label: 'More like this'},
    {value: '0', label: 'Less like this'}
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
    tiersLoading = false,
    postResourceOptions = [],
    onPostResourceSearchChange,
    postResourceSearchValue,
    postResourceLoading = false,
    emailResourceOptions = [],
    onEmailResourceSearchChange,
    emailResourceSearchValue,
    emailResourceLoading = false,
    membersTrackSources = false,
    emailTrackOpens = false,
    emailTrackClicks = false,
    audienceFeedbackEnabled = false,
    siteTimezone = 'Etc/UTC'
}: UseMembersFilterConfigOptions): FilterFieldGroup[] {
    return useMemo(() => {
        const groups: FilterFieldGroup[] = [];
        const today = new Date(new Date().toLocaleString('en-US', {timeZone: siteTimezone})).toISOString().split('T')[0];

        // ===== BASIC FILTERS =====
        const basicFields: FilterFieldConfig[] = [];

        basicFields.push({
            key: 'name',
            label: 'Name',
            type: 'text',
            icon: <LucideIcon.User className="size-4" />,
            placeholder: 'Enter name...',
            operators: TEXT_OPERATORS,
            defaultOperator: 'is',
            className: 'w-48'
        });

        basicFields.push({
            key: 'email',
            label: 'Email',
            type: 'text',
            icon: <LucideIcon.Mail className="size-4" />,
            placeholder: 'Enter email...',
            operators: TEXT_OPERATORS,
            defaultOperator: 'is',
            className: 'w-64'
        });

        if (labels.length > 0 || labelsOptions.length > 0) {
            basicFields.push({
                key: 'label',
                label: 'Label',
                type: 'select',
                icon: <LucideIcon.Tag className="size-4" />,
                options: labelsOptions.length > 0 ? labelsOptions : labels.map(l => ({
                    value: l.slug,
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

        // Subscribed filter goes in Basic when single newsletter, Newsletters group when multiple
        if (newsletters.length <= 1) {
            basicFields.push({
                key: 'subscribed',
                label: 'Newsletter subscription',
                type: 'select',
                icon: <LucideIcon.Mail className="size-4" />,
                options: SUBSCRIBED_OPTIONS_SINGLE,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false
            });
        }

        basicFields.push({
            key: 'last_seen_at',
            label: 'Last seen',
            type: 'date',
            icon: <LucideIcon.Eye className="size-4" />,
            operators: DATE_OPERATORS,
            defaultOperator: 'is-or-less',
            defaultValue: today,
            className: 'w-40'
        });

        basicFields.push({
            key: 'created_at',
            label: 'Created',
            type: 'date',
            icon: <LucideIcon.Calendar className="size-4" />,
            operators: DATE_OPERATORS,
            defaultOperator: 'is-or-less',
            defaultValue: today,
            className: 'w-40'
        });

        if (membersTrackSources) {
            basicFields.push({
                key: 'signup',
                label: 'Signed up on post/page',
                type: 'select',
                icon: <LucideIcon.UserPlus className="size-4" />,
                options: postResourceOptions,
                operators: IS_IS_NOT_OPERATORS,
                searchable: true,
                onSearchChange: onPostResourceSearchChange,
                searchValue: postResourceSearchValue,
                isLoading: postResourceLoading,
                placeholder: 'Select a post or page...',
                className: 'w-64'
            });
        }

        groups.push({
            group: 'Basic',
            fields: basicFields
        });

        // ===== NEWSLETTER FILTERS (if multiple newsletters) =====
        if (newsletters.length > 1) {
            const newsletterFields: FilterFieldConfig[] = [];

            // When multiple newsletters, the subscribed filter moves to this group
            newsletterFields.push({
                key: 'subscribed',
                label: 'All newsletters',
                type: 'select',
                icon: <LucideIcon.Mail className="size-4" />,
                options: SUBSCRIBED_OPTIONS_MULTIPLE,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false
            });

            newsletters.forEach((newsletter) => {
                newsletterFields.push({
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
                    hideOperatorSelect: true
                });
            });

            groups.push({
                group: 'Newsletters',
                fields: newsletterFields
            });
        }

        // ===== SUBSCRIPTION FILTERS (if paid members enabled) =====
        if (paidMembersEnabled) {
            const subscriptionFields: FilterFieldConfig[] = [];

            if (hasMultipleTiers) {
                subscriptionFields.push({
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
                    className: 'w-64'
                });
            }

            subscriptionFields.push({
                key: 'status',
                label: 'Member status',
                type: 'select',
                icon: <LucideIcon.UserCircle className="size-4" />,
                options: STATUS_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false
            });

            subscriptionFields.push({
                key: 'subscriptions.plan_interval',
                label: 'Billing period',
                type: 'select',
                icon: <LucideIcon.CalendarClock className="size-4" />,
                options: PLAN_INTERVAL_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false
            });

            subscriptionFields.push({
                key: 'subscriptions.status',
                label: 'Stripe subscription status',
                type: 'select',
                icon: <LucideIcon.CreditCard className="size-4" />,
                options: SUBSCRIPTION_STATUS_OPTIONS,
                operators: IS_IS_NOT_OPERATORS,
                searchable: false
            });

            subscriptionFields.push({
                key: 'subscriptions.start_date',
                label: 'Paid start date',
                type: 'date',
                icon: <LucideIcon.CalendarPlus className="size-4" />,
                operators: DATE_OPERATORS,
                defaultOperator: 'is-or-less',
                defaultValue: today,
                className: 'w-40'
            });

            subscriptionFields.push({
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                type: 'date',
                icon: <LucideIcon.CalendarArrowDown className="size-4" />,
                operators: DATE_OPERATORS,
                defaultOperator: 'is-or-less',
                defaultValue: today,
                className: 'w-40'
            });

            if (membersTrackSources) {
                subscriptionFields.push({
                    key: 'conversion',
                    label: 'Subscription started on post/page',
                    type: 'select',
                    icon: <LucideIcon.ArrowRightLeft className="size-4" />,
                    options: postResourceOptions,
                    operators: IS_IS_NOT_OPERATORS,
                    searchable: true,
                    onSearchChange: onPostResourceSearchChange,
                    searchValue: postResourceSearchValue,
                    isLoading: postResourceLoading,
                    placeholder: 'Select a post or page...',
                    className: 'w-64'
                });
            }

            groups.push({
                group: 'Subscription',
                fields: subscriptionFields
            });
        }

        // ===== EMAIL FILTERS (if email analytics enabled) =====
        if (emailAnalyticsEnabled) {
            const emailFields: FilterFieldConfig[] = [];

            emailFields.push({
                key: 'email_count',
                label: 'Emails sent (all time)',
                type: 'number',
                icon: <LucideIcon.Send className="size-4" />,
                operators: NUMBER_OPERATORS,
                defaultOperator: 'is',
                defaultValue: 0,
                min: 0,
                className: 'w-24'
            });

            emailFields.push({
                key: 'email_opened_count',
                label: 'Emails opened (all time)',
                type: 'number',
                icon: <LucideIcon.MailOpen className="size-4" />,
                operators: NUMBER_OPERATORS,
                defaultOperator: 'is',
                defaultValue: 0,
                min: 0,
                className: 'w-24'
            });

            if (emailTrackOpens) {
                emailFields.push({
                    key: 'email_open_rate',
                    label: 'Open rate (all time)',
                    type: 'number',
                    icon: <LucideIcon.Percent className="size-4" />,
                    operators: NUMBER_OPERATORS,
                    defaultOperator: 'is',
                    defaultValue: 0,
                    min: 0,
                    max: 100,
                    suffix: '%',
                    className: 'w-24'
                });
            }

            emailFields.push({
                key: 'emails.post_id',
                label: 'Sent email',
                type: 'select',
                icon: <LucideIcon.Send className="size-4" />,
                options: emailResourceOptions,
                operators: IS_IS_NOT_OPERATORS,
                searchable: true,
                onSearchChange: onEmailResourceSearchChange,
                searchValue: emailResourceSearchValue,
                isLoading: emailResourceLoading,
                placeholder: 'Select an email...',
                className: 'w-64'
            });

            if (emailTrackOpens) {
                emailFields.push({
                    key: 'opened_emails.post_id',
                    label: 'Opened email',
                    type: 'select',
                    icon: <LucideIcon.MailOpen className="size-4" />,
                    options: emailResourceOptions,
                    operators: IS_IS_NOT_OPERATORS,
                    searchable: true,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceLoading,
                    placeholder: 'Select an email...',
                    className: 'w-64'
                });
            }

            if (emailTrackClicks) {
                emailFields.push({
                    key: 'clicked_links.post_id',
                    label: 'Clicked email',
                    type: 'select',
                    icon: <LucideIcon.MousePointerClick className="size-4" />,
                    options: emailResourceOptions,
                    operators: IS_IS_NOT_OPERATORS,
                    searchable: true,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceLoading,
                    placeholder: 'Select an email...',
                    className: 'w-64'
                });
            }

            if (audienceFeedbackEnabled) {
                emailFields.push({
                    key: 'newsletter_feedback',
                    label: 'Responded with feedback',
                    type: 'select',
                    icon: <LucideIcon.MessageSquare className="size-4" />,
                    options: emailResourceOptions,
                    operators: AUDIENCE_FEEDBACK_OPERATORS,
                    defaultOperator: '1',
                    searchable: true,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceLoading,
                    placeholder: 'Select an email...',
                    className: 'w-64'
                });
            }

            groups.push({
                group: 'Email',
                fields: emailFields
            });
        }

        return groups;
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
        tiersLoading,
        postResourceOptions,
        onPostResourceSearchChange,
        postResourceSearchValue,
        postResourceLoading,
        emailResourceOptions,
        onEmailResourceSearchChange,
        emailResourceSearchValue,
        emailResourceLoading,
        membersTrackSources,
        emailTrackOpens,
        emailTrackClicks,
        audienceFeedbackEnabled,
        siteTimezone
    ]);
}
