import LabelFilterRenderer from '@src/components/label-picker/label-filter-renderer';
import React, {useMemo} from 'react';
import moment from 'moment-timezone';
import {CustomRendererProps, Filter, FilterFieldConfig, FilterFieldGroup, FilterOption, LucideIcon} from '@tryghost/shade';
import {memberFields} from './member-fields';
import type {Offer} from '@tryghost/admin-x-framework/api/offers';

interface UseMemberFilterFieldsOptions {
    labelsOptions?: FilterOption[];
    tiersOptions?: FilterOption[];
    newsletters?: Array<{slug: string; name: string; status?: string}>;
    hasMultipleTiers?: boolean;
    paidMembersEnabled?: boolean;
    emailAnalyticsEnabled?: boolean;
    postResourceOptions?: FilterOption[];
    onPostResourceSearchChange?: (search: string) => void;
    postResourceSearchValue?: string;
    postResourceLoading?: boolean;
    emailResourceOptions?: FilterOption[];
    onEmailResourceSearchChange?: (search: string) => void;
    emailResourceSearchValue?: string;
    emailResourceLoading?: boolean;
    offersOptions?: FilterOption[];
    hasOffers?: boolean;
    membersTrackSources?: boolean;
    emailTrackOpens?: boolean;
    emailTrackClicks?: boolean;
    audienceFeedbackEnabled?: boolean;
    siteTimezone?: string;
}

function toOperatorOptions(operators: readonly string[]) {
    return operators.map((operator) => ({
        value: operator,
        label: ({
            'is': 'is',
            'is-not': 'is not',
            'is-any': 'is any of',
            'is-not-any': 'is none of',
            'contains': 'contains',
            'does-not-contain': 'does not contain',
            'starts-with': 'starts with',
            'ends-with': 'ends with',
            'is-less': 'before',
            'is-or-less': 'on or before',
            'is-greater': 'after',
            'is-or-greater': 'on or after',
            '1': 'More like this',
            '0': 'Less like this'
        }[operator] ?? operator.replaceAll('-', ' '))
    }));
}

function getFieldIcon(key: string) {
    switch (key) {
    case 'name':
        return React.createElement(LucideIcon.User, {className: 'size-4'});
    case 'email':
    case 'subscribed':
        return React.createElement(LucideIcon.Mail, {className: 'size-4'});
    case 'label':
        return React.createElement(LucideIcon.Tag, {className: 'size-4'});
    case 'last_seen_at':
        return React.createElement(LucideIcon.Eye, {className: 'size-4'});
    case 'created_at':
        return React.createElement(LucideIcon.Calendar, {className: 'size-4'});
    case 'signup':
        return React.createElement(LucideIcon.UserPlus, {className: 'size-4'});
    case 'tier_id':
    case 'subscriptions.status':
        return React.createElement(LucideIcon.CreditCard, {className: 'size-4'});
    case 'status':
        return React.createElement(LucideIcon.UserCircle, {className: 'size-4'});
    case 'subscriptions.plan_interval':
        return React.createElement(LucideIcon.CalendarClock, {className: 'size-4'});
    case 'subscriptions.start_date':
        return React.createElement(LucideIcon.CalendarPlus, {className: 'size-4'});
    case 'subscriptions.current_period_end':
        return React.createElement(LucideIcon.CalendarArrowDown, {className: 'size-4'});
    case 'conversion':
        return React.createElement(LucideIcon.ArrowRightLeft, {className: 'size-4'});
    case 'email_count':
    case 'emails.post_id':
        return React.createElement(LucideIcon.Send, {className: 'size-4'});
    case 'email_opened_count':
    case 'opened_emails.post_id':
        return React.createElement(LucideIcon.MailOpen, {className: 'size-4'});
    case 'email_open_rate':
        return React.createElement(LucideIcon.Percent, {className: 'size-4'});
    case 'clicked_links.post_id':
        return React.createElement(LucideIcon.MousePointerClick, {className: 'size-4'});
    case 'newsletter_feedback':
        return React.createElement(LucideIcon.MessageSquare, {className: 'size-4'});
    case 'offer_redemptions':
        return React.createElement(LucideIcon.Ticket, {className: 'size-4'});
    default:
        if (key.startsWith('newsletters.')) {
            return React.createElement(LucideIcon.Newspaper, {className: 'size-4'});
        }

        return undefined;
    }
}

function createFieldConfig(
    key: string,
    overrides: Partial<FilterFieldConfig> = {}
): FilterFieldConfig {
    const field = key.startsWith('newsletters.')
        ? memberFields['newsletters.:slug']
        : memberFields[key as keyof typeof memberFields];

    return {
        key,
        ...field.ui,
        icon: getFieldIcon(key),
        operators: toOperatorOptions(field.operators),
        ...('options' in field && field.options ? {options: field.options} : {}),
        ...overrides
    };
}

export function buildRetentionOfferIdMap(offers: Offer[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const monthlyIds: string[] = [];
    const yearlyIds: string[] = [];

    for (const offer of offers) {
        if (offer.redemption_type === 'retention') {
            if (offer.cadence === 'month') {
                monthlyIds.push(offer.id);
            } else if (offer.cadence === 'year') {
                yearlyIds.push(offer.id);
            }
        }
    }

    if (monthlyIds.length > 0) {
        map.set('retention:month', monthlyIds);
    }

    if (yearlyIds.length > 0) {
        map.set('retention:year', yearlyIds);
    }

    return map;
}

export function buildOfferOptions(offers: Offer[], retentionOffersEnabled: boolean, retentionMap: Map<string, string[]>): FilterOption[] {
    const options: FilterOption[] = [];

    for (const offer of offers) {
        if (retentionOffersEnabled && offer.redemption_type === 'retention') {
            continue;
        }

        options.push({value: offer.id, label: offer.name});
    }

    if (retentionOffersEnabled) {
        if (retentionMap.has('retention:month')) {
            options.push({value: 'retention:month', label: 'Monthly Retention'});
        }

        if (retentionMap.has('retention:year')) {
            options.push({value: 'retention:year', label: 'Yearly Retention'});
        }
    }

    return options;
}

export function collapseRetentionOfferFilters(filters: Filter[], retentionMap: Map<string, string[]>): Filter[] {
    if (retentionMap.size === 0) {
        return filters;
    }

    return filters.map((filter) => {
        if (filter.field !== 'offer_redemptions') {
            return filter;
        }

        const values = [...filter.values as string[]];
        const collapsed: string[] = [];
        const consumed = new Set<string>();

        for (const [syntheticId, realIds] of retentionMap) {
            if (realIds.length > 0 && realIds.every(id => values.includes(id))) {
                collapsed.push(syntheticId);
                realIds.forEach(id => consumed.add(id));
            }
        }

        for (const value of values) {
            if (!consumed.has(value)) {
                collapsed.push(value);
            }
        }

        return {
            ...filter,
            values: collapsed
        };
    });
}

export function expandRetentionOfferFilters(filters: Filter[], retentionMap: Map<string, string[]>): Filter[] {
    if (retentionMap.size === 0) {
        return filters;
    }

    return filters.map((filter) => {
        if (filter.field !== 'offer_redemptions') {
            return filter;
        }

        const values: string[] = [];

        for (const value of filter.values as string[]) {
            const realIds = retentionMap.get(String(value));

            if (realIds) {
                values.push(...realIds);
            } else {
                values.push(String(value));
            }
        }

        return {
            ...filter,
            values: [...new Set(values)]
        };
    });
}

export function useMemberFilterFields({
    labelsOptions = [],
    tiersOptions = [],
    newsletters = [],
    hasMultipleTiers = false,
    paidMembersEnabled = false,
    emailAnalyticsEnabled = false,
    postResourceOptions = [],
    onPostResourceSearchChange,
    postResourceSearchValue,
    postResourceLoading = false,
    emailResourceOptions = [],
    onEmailResourceSearchChange,
    emailResourceSearchValue,
    emailResourceLoading = false,
    offersOptions = [],
    hasOffers = false,
    membersTrackSources = false,
    emailTrackOpens = false,
    emailTrackClicks = false,
    audienceFeedbackEnabled = false,
    siteTimezone = 'UTC'
}: UseMemberFilterFieldsOptions): FilterFieldGroup[] {
    return useMemo(() => {
        const groups: FilterFieldGroup[] = [];
        const activeNewsletters = newsletters.filter(newsletter => newsletter.status !== 'archived');
        const today = moment.tz(siteTimezone).format('YYYY-MM-DD');

        const basicFields: FilterFieldConfig[] = [
            createFieldConfig('name'),
            createFieldConfig('email')
        ];

        if (labelsOptions.length > 0) {
            basicFields.push(createFieldConfig('label', {
                type: 'select',
                options: labelsOptions,
                customRenderer: props => React.createElement(LabelFilterRenderer, props as CustomRendererProps<string>)
            }));
        }

        if (activeNewsletters.length <= 1) {
            basicFields.push(createFieldConfig('subscribed'));
        }

        basicFields.push(
            createFieldConfig('last_seen_at', {defaultValue: today}),
            createFieldConfig('created_at', {defaultValue: today})
        );

        if (membersTrackSources) {
            basicFields.push(createFieldConfig('signup', {
                options: postResourceOptions,
                onSearchChange: onPostResourceSearchChange,
                searchValue: postResourceSearchValue,
                isLoading: postResourceOptions.length === 0 && postResourceLoading
            }));
        }

        groups.push({group: 'Basic', fields: basicFields});

        if (activeNewsletters.length > 1) {
            const newsletterFields: FilterFieldConfig[] = [
                createFieldConfig('subscribed', {
                    label: 'All newsletters',
                    options: [
                        {value: 'subscribed', label: 'Subscribed to at least one'},
                        {value: 'unsubscribed', label: 'Unsubscribed from all'},
                        {value: 'email-disabled', label: 'Email disabled'}
                    ]
                })
            ];

            for (const newsletter of activeNewsletters) {
                newsletterFields.push(createFieldConfig(`newsletters.${newsletter.slug}`, {
                    label: newsletter.name
                }));
            }

            groups.push({group: 'Newsletters', fields: newsletterFields});
        }

        if (paidMembersEnabled) {
            const subscriptionFields: FilterFieldConfig[] = [];

            if (hasMultipleTiers) {
                subscriptionFields.push(createFieldConfig('tier_id', {
                    options: tiersOptions
                }));
            }

            subscriptionFields.push(
                createFieldConfig('status'),
                createFieldConfig('subscriptions.plan_interval'),
                createFieldConfig('subscriptions.status'),
                createFieldConfig('subscriptions.start_date', {defaultValue: today}),
                createFieldConfig('subscriptions.current_period_end', {defaultValue: today})
            );

            if (membersTrackSources) {
                subscriptionFields.push(createFieldConfig('conversion', {
                    options: postResourceOptions,
                    onSearchChange: onPostResourceSearchChange,
                    searchValue: postResourceSearchValue,
                    isLoading: postResourceOptions.length === 0 && postResourceLoading
                }));
            }

            if (hasOffers) {
                subscriptionFields.push(createFieldConfig('offer_redemptions', {
                    options: offersOptions
                }));
            }

            groups.push({group: 'Subscription', fields: subscriptionFields});
        }

        if (emailAnalyticsEnabled) {
            const emailFields: FilterFieldConfig[] = [
                createFieldConfig('email_count'),
                createFieldConfig('email_opened_count')
            ];

            if (emailTrackOpens) {
                emailFields.push(createFieldConfig('email_open_rate'));
            }

            emailFields.push(createFieldConfig('emails.post_id', {
                options: emailResourceOptions,
                onSearchChange: onEmailResourceSearchChange,
                searchValue: emailResourceSearchValue,
                isLoading: emailResourceOptions.length === 0 && emailResourceLoading
            }));

            if (emailTrackOpens) {
                emailFields.push(createFieldConfig('opened_emails.post_id', {
                    options: emailResourceOptions,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceOptions.length === 0 && emailResourceLoading
                }));
            }

            if (emailTrackClicks) {
                emailFields.push(createFieldConfig('clicked_links.post_id', {
                    options: emailResourceOptions,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceOptions.length === 0 && emailResourceLoading
                }));
            }

            if (audienceFeedbackEnabled) {
                emailFields.push(createFieldConfig('newsletter_feedback', {
                    options: emailResourceOptions,
                    onSearchChange: onEmailResourceSearchChange,
                    searchValue: emailResourceSearchValue,
                    isLoading: emailResourceOptions.length === 0 && emailResourceLoading
                }));
            }

            groups.push({group: 'Email', fields: emailFields});
        }

        return groups;
    }, [
        audienceFeedbackEnabled,
        emailAnalyticsEnabled,
        emailResourceLoading,
        emailResourceOptions,
        emailResourceSearchValue,
        emailTrackClicks,
        emailTrackOpens,
        hasMultipleTiers,
        hasOffers,
        labelsOptions,
        membersTrackSources,
        newsletters,
        offersOptions,
        onEmailResourceSearchChange,
        onPostResourceSearchChange,
        paidMembersEnabled,
        postResourceLoading,
        postResourceOptions,
        postResourceSearchValue,
        siteTimezone,
        tiersOptions
    ]);
}
