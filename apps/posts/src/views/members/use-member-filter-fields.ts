import React, {useMemo} from 'react';
import moment from 'moment-timezone';
import {FilterFieldConfig, FilterFieldGroup, FilterOption, LucideIcon, ValueSource} from '@tryghost/shade';
import {LabelFilterRenderer} from '@src/components/label-picker';
import {memberFields} from './member-fields';
import type {Offer} from '@tryghost/admin-x-framework/api/offers';

interface UseMemberFilterFieldsOptions {
    labelValueSource?: ValueSource<string>;
    tierValueSource?: ValueSource<string>;
    newsletters?: Array<{slug: string; name: string; status?: string}>;
    hydratedNewsletterSlugs?: string[];
    hasMultipleTiers?: boolean;
    paidMembersEnabled?: boolean;
    emailFiltersEnabled?: boolean;
    postValueSource?: ValueSource<string>;
    emailValueSource?: ValueSource<string>;
    offers?: Offer[];
    membersTrackSources?: boolean;
    emailTrackOpens?: boolean;
    emailTrackClicks?: boolean;
    siteTimezone?: string;
}

type OfferOption = FilterOption<string>;
type SearchableFieldOverrides = Pick<FilterFieldConfig, 'options' | 'valueSource'>;

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

const MEMBER_OPERATOR_LABELS: Record<string, string> = {
    'is-any': 'is any of',
    'is-not-any': 'is none of',
    'does-not-contain': 'does not contain',
    'is-less': 'before',
    'is-or-less': 'on or before',
    'is-greater': 'after',
    'is-or-greater': 'on or after',
    1: 'More like this',
    0: 'Less like this'
};

const NUMBER_OPERATOR_LABELS: Record<string, string> = {
    'is-greater': 'is greater than',
    'is-less': 'is less than'
};

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
    overrides: Partial<FilterFieldConfig> = {},
    operatorLabels: Record<string, string> = MEMBER_OPERATOR_LABELS
): FilterFieldConfig {
    const field = key.startsWith('newsletters.')
        ? memberFields['newsletters.:slug']
        : memberFields[key as keyof typeof memberFields];

    return {
        key,
        ...field.ui,
        icon: getFieldIcon(key),
        operators: createOperatorOptions(field.operators, {labels: operatorLabels}),
        ...('options' in field && field.options ? {options: field.options} : {}),
        ...overrides
    };
}

function createDateFieldConfig(key: string, defaultValue: string) {
    return createFieldConfig(key, {defaultValue});
}

function createSearchableFieldOverrides(
    options: FilterOption[],
    valueSource?: ValueSource<string>
): SearchableFieldOverrides {
    return {
        options,
        valueSource
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
    labelValueSource,
    tierValueSource,
    newsletters = [],
    hydratedNewsletterSlugs = [],
    hasMultipleTiers = false,
    paidMembersEnabled = false,
    emailFiltersEnabled = false,
    postValueSource,
    emailValueSource,
    offers = [],
    membersTrackSources = false,
    emailTrackOpens = false,
    emailTrackClicks = false,
    siteTimezone = 'UTC'
}: UseMemberFilterFieldsOptions): FilterFieldGroup[] {
    return useMemo(() => {
        const groups: FilterFieldGroup[] = [];
        const activeNewsletters = newsletters.filter(newsletter => newsletter.status !== 'archived');
        const activeNewsletterSlugs = new Set(activeNewsletters.map(newsletter => newsletter.slug));
        const visibleHydratedNewsletters = [...new Set(hydratedNewsletterSlugs)].map((slug) => {
            const newsletter = newsletters.find(currentNewsletter => currentNewsletter.slug === slug);

            return {
                slug,
                name: newsletter?.name ?? slug
            };
        });
        const hiddenHydratedNewsletters = visibleHydratedNewsletters.filter(newsletter => !activeNewsletterSlugs.has(newsletter.slug));
        const offerOptions = buildOfferOptions(offers);
        const offerLabels = createOfferLabelMap(offers);
        const today = moment.tz(siteTimezone).format('YYYY-MM-DD');

        const basicFields: FilterFieldConfig[] = [
            createFieldConfig('name'),
            createFieldConfig('email')
        ];

        if (labelValueSource) {
            basicFields.push(createFieldConfig('label', {
                ...createSearchableFieldOverrides([], labelValueSource),
                customRenderer: props => React.createElement(LabelFilterRenderer, props as React.ComponentProps<typeof LabelFilterRenderer>)
            }));
        }

        if (activeNewsletters.length <= 1) {
            basicFields.push(createFieldConfig('subscribed'));

            for (const newsletter of visibleHydratedNewsletters) {
                basicFields.push(createFieldConfig(`newsletters.${newsletter.slug}`, {
                    label: newsletter.name
                }));
            }
        }

        basicFields.push(
            createDateFieldConfig('last_seen_at', today),
            createDateFieldConfig('created_at', today)
        );

        if (membersTrackSources) {
            basicFields.push(createFieldConfig('signup', createSearchableFieldOverrides(
                [],
                postValueSource
            )));
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

            for (const newsletter of hiddenHydratedNewsletters) {
                newsletterFields.push(createFieldConfig(`newsletters.${newsletter.slug}`, {
                    label: newsletter.name
                }));
            }

            groups.push({group: 'Newsletters', fields: newsletterFields});
        }

        if (paidMembersEnabled) {
            const subscriptionFields: FilterFieldConfig[] = [];

            if (hasMultipleTiers) {
                subscriptionFields.push(createFieldConfig('tier_id', createSearchableFieldOverrides([], tierValueSource)));
            }

            subscriptionFields.push(
                createFieldConfig('status'),
                createFieldConfig('subscriptions.plan_interval'),
                createFieldConfig('subscriptions.status'),
                createDateFieldConfig('subscriptions.start_date', today),
                createDateFieldConfig('subscriptions.current_period_end', today)
            );

            if (membersTrackSources) {
                subscriptionFields.push(createFieldConfig('conversion', createSearchableFieldOverrides(
                    [],
                    postValueSource
                )));
            }

            if (offers.length > 0) {
                subscriptionFields.push(createFieldConfig('offer_redemptions', {
                    options: offerOptions,
                    customValueRenderer: values => renderOfferFilterValues(values as string[], offerOptions, offerLabels)
                }));
            }

            groups.push({group: 'Subscription', fields: subscriptionFields});
        }

        if (emailFiltersEnabled) {
            const emailFields: FilterFieldConfig[] = [
                createFieldConfig('email_count', {}, NUMBER_OPERATOR_LABELS),
                createFieldConfig('email_opened_count', {}, NUMBER_OPERATOR_LABELS)
            ];

            if (emailTrackOpens) {
                emailFields.push(createFieldConfig('email_open_rate', {}, NUMBER_OPERATOR_LABELS));
            }

            emailFields.push(createFieldConfig('emails.post_id', createSearchableFieldOverrides(
                [],
                emailValueSource
            )));

            if (emailTrackOpens) {
                emailFields.push(createFieldConfig('opened_emails.post_id', createSearchableFieldOverrides(
                    [],
                    emailValueSource
                )));
            }

            if (emailTrackClicks) {
                emailFields.push(createFieldConfig('clicked_links.post_id', createSearchableFieldOverrides(
                    [],
                    emailValueSource
                )));
            }

            emailFields.push(createFieldConfig('newsletter_feedback', createSearchableFieldOverrides(
                [],
                emailValueSource
            )));

            groups.push({group: 'Email', fields: emailFields});
        }

        return groups;
    }, [
        emailFiltersEnabled,
        emailValueSource,
        emailTrackClicks,
        emailTrackOpens,
        hasMultipleTiers,
        labelValueSource,
        membersTrackSources,
        newsletters,
        offers,
        hydratedNewsletterSlugs,
        paidMembersEnabled,
        postValueSource,
        siteTimezone,
        tierValueSource
    ]);
}
