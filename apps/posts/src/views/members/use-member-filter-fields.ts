import LabelFilterRenderer from '@src/components/label-picker/label-filter-renderer';
import React, {useMemo} from 'react';
import moment from 'moment-timezone';
import {CustomRendererProps, FilterFieldConfig, FilterFieldGroup, FilterOption, LucideIcon} from '@tryghost/shade';
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
    offers?: Offer[];
    membersTrackSources?: boolean;
    emailTrackOpens?: boolean;
    emailTrackClicks?: boolean;
    audienceFeedbackEnabled?: boolean;
    siteTimezone?: string;
}

type OfferOption = FilterOption<string>;
type SearchableFieldOverrides = Pick<FilterFieldConfig, 'options' | 'onSearchChange' | 'searchValue' | 'isLoading'>;
type OptionalValue<T> = T | null | false | undefined;
type FieldSpec = string | {key: string; overrides?: Partial<FilterFieldConfig>};

interface OperatorOption {
    value: string;
    label: string;
}

function createOperatorOptions(
    operators: readonly string[],
    options: {labels?: Record<string, string>} = {}
): OperatorOption[] {
    const labels = options.labels || {};

    return operators.map(operator => ({
        value: operator,
        label: labels[operator] ?? operator.replaceAll('-', ' ')
    }));
}

const MEMBER_OPERATOR_LABELS = {
    'is-not-any': 'is none of',
    'does-not-contain': 'does not contain',
    'is-less': 'before',
    'is-or-less': 'on or before',
    'is-greater': 'after',
    'is-or-greater': 'on or after',
    1: 'More like this',
    0: 'Less like this'
};

const FIELD_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
    name: LucideIcon.User,
    email: LucideIcon.Mail,
    subscribed: LucideIcon.Mail,
    label: LucideIcon.Tag,
    last_seen_at: LucideIcon.Eye,
    created_at: LucideIcon.Calendar,
    signup: LucideIcon.UserPlus,
    tier_id: LucideIcon.CreditCard,
    status: LucideIcon.UserCircle,
    'subscriptions.plan_interval': LucideIcon.CalendarClock,
    'subscriptions.status': LucideIcon.CreditCard,
    'subscriptions.start_date': LucideIcon.CalendarPlus,
    'subscriptions.current_period_end': LucideIcon.CalendarArrowDown,
    conversion: LucideIcon.ArrowRightLeft,
    email_count: LucideIcon.Send,
    email_opened_count: LucideIcon.MailOpen,
    email_open_rate: LucideIcon.Percent,
    'emails.post_id': LucideIcon.Send,
    'opened_emails.post_id': LucideIcon.MailOpen,
    'clicked_links.post_id': LucideIcon.MousePointerClick,
    newsletter_feedback: LucideIcon.MessageSquare,
    offer_redemptions: LucideIcon.Ticket
};

function getFieldIcon(key: string) {
    const Icon = FIELD_ICONS[key] ?? (key.startsWith('newsletters.') ? LucideIcon.Newspaper : undefined);

    return Icon ? React.createElement(Icon, {className: 'size-4'}) : undefined;
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
        operators: createOperatorOptions(field.operators, {labels: MEMBER_OPERATOR_LABELS}),
        ...('options' in field && field.options ? {options: field.options} : {}),
        ...overrides
    };
}

function createFieldConfigs(specs: Array<FieldSpec | false | null | undefined>): FilterFieldConfig[] {
    return specs.flatMap((spec) => {
        if (!spec) {
            return [];
        }

        if (typeof spec === 'string') {
            return [createFieldConfig(spec)];
        }

        return [createFieldConfig(spec.key, spec.overrides)];
    });
}

function createSearchableFieldOverrides(
    options: FilterOption[],
    onSearchChange: ((search: string) => void) | undefined,
    searchValue: string | undefined,
    isLoading: boolean
): SearchableFieldOverrides {
    return {
        options,
        onSearchChange,
        searchValue,
        isLoading: options.length === 0 && isLoading
    };
}

function compactValues<T>(values: OptionalValue<T>[]): T[] {
    return values.filter((value): value is T => Boolean(value));
}

function buildRetentionOfferIdMap(offers: Offer[]): Map<string, string[]> {
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

function getOfferGroupIds(option: FilterOption): string[] | null {
    if (!Array.isArray(option.metadata?.offerIds)) {
        return null;
    }

    return option.metadata.offerIds.filter((value): value is string => typeof value === 'string');
}

export function buildOfferOptions(offers: Offer[]): OfferOption[] {
    const options: OfferOption[] = [];
    const retentionMap = buildRetentionOfferIdMap(offers);

    for (const offer of offers) {
        if (offer.redemption_type === 'retention') {
            continue;
        }

        options.push({value: offer.id, label: offer.name});
    }

    if (retentionMap.has('retention:month')) {
        options.push({
            value: 'retention:month',
            label: 'Monthly Retention',
            metadata: {offerIds: retentionMap.get('retention:month')}
        });
    }

    if (retentionMap.has('retention:year')) {
        options.push({
            value: 'retention:year',
            label: 'Yearly Retention',
            metadata: {offerIds: retentionMap.get('retention:year')}
        });
    }

    return options;
}

export function toOfferFilterDisplayValues(values: string[], options: FilterOption[]): string[] {
    const collapsed: string[] = [];
    const consumed = new Set<string>();

    for (const option of options) {
        const groupIds = getOfferGroupIds(option);

        if (groupIds && groupIds.length > 0 && groupIds.every(id => values.includes(id))) {
            collapsed.push(String(option.value));
            groupIds.forEach((id) => {
                consumed.add(id);
            });
        }
    }

    for (const value of values) {
        if (!consumed.has(value)) {
            collapsed.push(value);
        }
    }

    return collapsed;
}

export function fromOfferFilterDisplayValues(values: string[], options: FilterOption[]): string[] {
    const expanded: string[] = [];

    for (const value of values) {
        const option = options.find(currentOption => currentOption.value === value);
        const groupIds = option ? getOfferGroupIds(option) : null;

        if (groupIds) {
            expanded.push(...groupIds);
        } else {
            expanded.push(value);
        }
    }

    return [...new Set(expanded)];
}

function createOfferLabelMap(offers: Offer[]) {
    return new Map(offers.map(offer => [offer.id, offer.name]));
}

function renderOfferFilterValues(values: string[], options: OfferOption[], offerLabels: Map<string, string>) {
    const selectedOptions = values
        .map(value => options.find(option => option.value === value))
        .filter((option): option is OfferOption => Boolean(option));

    if (selectedOptions.length === 1) {
        return selectedOptions[0].label;
    }

    if (selectedOptions.length > 1) {
        return `${selectedOptions.length} selected`;
    }

    if (values.length === 1) {
        return offerLabels.get(values[0]) ?? 'Select...';
    }

    if (values.length > 1) {
        return `${values.length} selected`;
    }

    return 'Select...';
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
    offers = [],
    membersTrackSources = false,
    emailTrackOpens = false,
    emailTrackClicks = false,
    audienceFeedbackEnabled = false,
    siteTimezone = 'UTC'
}: UseMemberFilterFieldsOptions): FilterFieldGroup[] {
    return useMemo(() => {
        const activeNewsletters = newsletters.filter(newsletter => newsletter.status !== 'archived');
        const offerOptions = buildOfferOptions(offers);
        const offerLabels = createOfferLabelMap(offers);
        const today = moment.tz(siteTimezone).format('YYYY-MM-DD');
        const postSearchOverrides = createSearchableFieldOverrides(
            postResourceOptions,
            onPostResourceSearchChange,
            postResourceSearchValue,
            postResourceLoading
        );
        const emailSearchOverrides = createSearchableFieldOverrides(
            emailResourceOptions,
            onEmailResourceSearchChange,
            emailResourceSearchValue,
            emailResourceLoading
        );

        const basicFields = createFieldConfigs([
            'name',
            'email',
            labelsOptions.length > 0 && {
                key: 'label',
                overrides: {
                    type: 'select',
                    options: labelsOptions,
                    customRenderer: props => React.createElement(LabelFilterRenderer, props as CustomRendererProps<string>)
                }
            },
            activeNewsletters.length <= 1 && 'subscribed',
            {key: 'last_seen_at', overrides: {defaultValue: today}},
            {key: 'created_at', overrides: {defaultValue: today}},
            membersTrackSources && {key: 'signup', overrides: postSearchOverrides}
        ]);

        const newsletterFields = activeNewsletters.length > 1
            ? createFieldConfigs([
                {
                    key: 'subscribed',
                    overrides: {
                        label: 'All newsletters',
                        options: [
                            {value: 'subscribed', label: 'Subscribed to at least one'},
                            {value: 'unsubscribed', label: 'Unsubscribed from all'},
                            {value: 'email-disabled', label: 'Email disabled'}
                        ]
                    }
                },
                ...activeNewsletters.map(newsletter => ({
                    key: `newsletters.${newsletter.slug}`,
                    overrides: {label: newsletter.name}
                }))
            ])
            : null;

        const subscriptionFields = paidMembersEnabled
            ? createFieldConfigs([
                hasMultipleTiers && {key: 'tier_id', overrides: {options: tiersOptions}},
                'status',
                'subscriptions.plan_interval',
                'subscriptions.status',
                {key: 'subscriptions.start_date', overrides: {defaultValue: today}},
                {key: 'subscriptions.current_period_end', overrides: {defaultValue: today}},
                membersTrackSources && {key: 'conversion', overrides: postSearchOverrides},
                offers.length > 0 && {
                    key: 'offer_redemptions',
                    overrides: {
                        options: offerOptions,
                        customValueRenderer: values => renderOfferFilterValues(values as string[], offerOptions, offerLabels)
                    }
                }
            ])
            : null;

        const emailFields = emailAnalyticsEnabled
            ? createFieldConfigs([
                'email_count',
                'email_opened_count',
                emailTrackOpens && 'email_open_rate',
                {key: 'emails.post_id', overrides: emailSearchOverrides},
                emailTrackOpens && {key: 'opened_emails.post_id', overrides: emailSearchOverrides},
                emailTrackClicks && {key: 'clicked_links.post_id', overrides: emailSearchOverrides},
                audienceFeedbackEnabled && {key: 'newsletter_feedback', overrides: emailSearchOverrides}
            ])
            : null;

        return compactValues([
            {group: 'Basic', fields: basicFields},
            newsletterFields && {group: 'Newsletters', fields: newsletterFields},
            subscriptionFields && {group: 'Subscription', fields: subscriptionFields},
            emailFields && {group: 'Email', fields: emailFields}
        ]);
    }, [
        audienceFeedbackEnabled,
        emailAnalyticsEnabled,
        emailResourceLoading,
        emailResourceOptions,
        emailResourceSearchValue,
        emailTrackClicks,
        emailTrackOpens,
        hasMultipleTiers,
        labelsOptions,
        membersTrackSources,
        newsletters,
        offers,
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
