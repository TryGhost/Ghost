import React, { useMemo } from 'react';
import {
  RELATIVE_DATE_OPERATOR_LABELS,
  createOperatorOptions,
  createRelativeDateRenderer,
  fieldHasRelativeOperator,
  getTodayInTimezone,
  FIELD_ICONS,
} from '@/shared/filters';
import type { FieldIcon } from '@/shared/filters';
import { CUSTOM_FIELDS_PREFIX } from '@/members/member-fields';
import { keyIsUnder } from '@/shared/filters';
import type { StaticMemberFieldKey } from '@/members/member-fields';
import {
  type FilterFieldConfig,
  type FilterFieldGroup,
  type FilterOption,
  type ValueSource,
} from '@tryghost/shade/patterns';
import CustomFieldFilterRenderer from './custom-fields/filter-renderer';
import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import { LabelFilterRenderer } from '@/members/label-picker';
import { LucideIcon } from '@tryghost/shade/utils';
import { MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD } from './multiple-active-subscriptions';
import { buildMemberFields } from './member-filter-catalog';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { Offer } from '@tryghost/admin-x-framework/api/offers';

interface UseMemberFilterFieldsOptions {
  labelValueSource?: ValueSource<string>;
  tierValueSource?: ValueSource<string>;
  newsletters?: Array<{ slug: string; name: string; status?: string }>;
  hydratedNewsletterSlugs?: string[];
  hasMultipleTiers?: boolean;
  paidMembersEnabled?: boolean;
  emailFiltersEnabled?: boolean;
  postValueSource?: ValueSource<string>;
  emailValueSource?: ValueSource<string>;
  offers?: Offer[];
  multipleActiveSubscriptionsCount?: number;
  membersTrackSources?: boolean;
  emailTrackOpens?: boolean;
  emailTrackClicks?: boolean;
  customFieldsEnabled?: boolean;
  customFields?: Array<{ key: string; name: string; type: MemberCustomField['type'] }>;
  // Archived fields still referenced by the current filter. Rendered as disabled,
  // removable-only pills so a saved segment stays visible and undoable even though
  // the field is no longer offered in the picker.
  archivedCustomFields?: Array<{ key: string; name: string }>;
  siteTimezone?: string;
}

type OfferOption = FilterOption<string>;
type SearchableFieldOverrides = Pick<FilterFieldConfig, 'options' | 'valueSource'>;

type PickerKey = StaticMemberFieldKey | `newsletters.${string}` | `custom_fields.${string}`;

const BASIC_ORDER = [
  'name',
  'email',
  'label',
  'subscribed',
  'last_seen_at',
  'created_at',
  'signup',
] as const;

const SUBSCRIPTION_ORDER = [
  'tier_id',
  'status',
  MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD,
  'subscriptions.plan_interval',
  'subscriptions.status',
  'subscriptions.start_date',
  'subscriptions.current_period_end',
  'conversion',
  'offer_redemptions',
] as const;

const EMAIL_ORDER = [
  'email_count',
  'email_opened_count',
  'email_open_rate',
  'emails.post_id',
  'opened_emails.post_id',
  'clicked_links.post_id',
  'newsletter_feedback',
] as const;

type PlacedFieldKey =
  | (typeof BASIC_ORDER)[number]
  | (typeof SUBSCRIPTION_ORDER)[number]
  | (typeof EMAIL_ORDER)[number];

const EVERY_DECLARED_FIELD_IS_PLACED: Exclude<StaticMemberFieldKey, PlacedFieldKey> extends never
  ? true
  : { fieldsWithNoGroup: Exclude<StaticMemberFieldKey, PlacedFieldKey> } = true;

void EVERY_DECLARED_FIELD_IS_PLACED;

// How many custom fields the picker shows before "Show more" — the same preview
// size the settings list uses. The rest stay searchable and resolvable.
const NO_NEWSLETTERS: NonNullable<UseMemberFilterFieldsOptions['newsletters']> = [];
const NO_SLUGS: string[] = [];
const NO_OFFERS: NonNullable<UseMemberFilterFieldsOptions['offers']> = [];
const NO_CUSTOM_FIELDS: NonNullable<UseMemberFilterFieldsOptions['customFields']> = [];
const NO_ARCHIVED_CUSTOM_FIELDS: NonNullable<UseMemberFilterFieldsOptions['archivedCustomFields']> =
  [];

const CUSTOM_FIELDS_PREVIEW_LIMIT = 5;

const MEMBER_OPERATOR_LABELS: Partial<Record<string, string>> = {
  'is-any': 'is any of',
  'is-not-any': 'is none of',
  'does-not-contain': 'does not contain',
  ...RELATIVE_DATE_OPERATOR_LABELS,
  1: 'More like this',
  0: 'Less like this',
};

function createSearchableFieldOverrides(
  options: FilterOption[],
  valueSource?: ValueSource<string>,
): SearchableFieldOverrides {
  return {
    options,
    valueSource,
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

    options.push({ value: offer.id, label: offer.name });
  }

  if (retentionMap.has('retention:month')) {
    options.push({
      value: 'retention:month',
      label: 'Monthly Retention',
      metadata: { offerIds: retentionMap.get('retention:month') },
    });
  }

  if (retentionMap.has('retention:year')) {
    options.push({
      value: 'retention:year',
      label: 'Yearly Retention',
      metadata: { offerIds: retentionMap.get('retention:year') },
    });
  }

  return options;
}

export function toOfferFilterDisplayValues(values: string[], options: FilterOption[]): string[] {
  const collapsed: string[] = [];
  const consumed = new Set<string>();

  for (const option of options) {
    const groupIds = getOfferGroupIds(option);

    if (groupIds && groupIds.length > 0 && groupIds.every((id) => values.includes(id))) {
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
    const option = options.find((currentOption) => currentOption.value === value);
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
  return new Map(offers.map((offer) => [offer.id, offer.name]));
}

function renderOfferFilterValues(
  values: string[],
  options: OfferOption[],
  offerLabels: Map<string, string>,
) {
  const selectedOptions = values
    .map((value) => options.find((option) => option.value === value))
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
  newsletters = NO_NEWSLETTERS,
  hydratedNewsletterSlugs = NO_SLUGS,
  hasMultipleTiers = false,
  paidMembersEnabled = false,
  emailFiltersEnabled = false,
  postValueSource,
  emailValueSource,
  offers = NO_OFFERS,
  multipleActiveSubscriptionsCount = 0,
  membersTrackSources = false,
  emailTrackOpens = false,
  emailTrackClicks = false,
  customFieldsEnabled = false,
  customFields = NO_CUSTOM_FIELDS,
  archivedCustomFields = NO_ARCHIVED_CUSTOM_FIELDS,
  siteTimezone = 'UTC',
}: UseMemberFilterFieldsOptions): FilterFieldGroup[] {
  // Which fields exist is decided by the site's own data, and nothing else. Kept apart from the
  // picker below because building it builds a codec for every field, while the picker changes
  // whenever the view does — on every filter edit, among other things.
  const fields = useMemo(() => {
    const catalogNewsletters = [
      ...newsletters,
      ...hydratedNewsletterSlugs
        .filter((slug) => !newsletters.some((newsletter) => newsletter.slug === slug))
        .map((slug) => ({ slug, name: slug })),
    ];

    return buildMemberFields({
      newsletters: catalogNewsletters,
      customFields: [
        ...customFields,
        ...archivedCustomFields.map((field) => ({ ...field, type: 'short_text' as const })),
      ],
    });
  }, [newsletters, hydratedNewsletterSlugs, customFields, archivedCustomFields]);

  return useMemo(() => {
    function createFieldConfig(
      key: PickerKey,
      overrides: Partial<FilterFieldConfig> = {},
      operatorLabels: Partial<Record<string, string>> = MEMBER_OPERATOR_LABELS,
    ): FilterFieldConfig {
      const parameterised = keyIsUnder(key, 'newsletters')
        ? fields['newsletters.:slug']
        : keyIsUnder(key, CUSTOM_FIELDS_PREFIX)
          ? fields['custom_fields.:key']
          : undefined;
      const field = fields[key] ?? parameterised;

      return {
        key,
        ...field.ui,
        icon: FIELD_ICONS[field.ui.icon as FieldIcon],
        operators: createOperatorOptions(field.operators, {
          labels: { ...operatorLabels, ...field.operatorLabels },
        }),
        ...('options' in field && field.options ? { options: field.options } : {}),
        ...overrides,
      };
    }

    function createDateFieldConfig(
      key: PickerKey,
      today: string,
      overrides: Partial<FilterFieldConfig> = {},
    ): FilterFieldConfig {
      const field = fields[key];
      const config = createFieldConfig(key, { defaultValue: today, ...overrides });

      return fieldHasRelativeOperator(field)
        ? { ...config, customRenderer: createRelativeDateRenderer(today) }
        : config;
    }

    const groups: FilterFieldGroup[] = [];
    const activeNewsletters = newsletters.filter((newsletter) => newsletter.status !== 'archived');
    const activeNewsletterSlugs = new Set(activeNewsletters.map((newsletter) => newsletter.slug));
    const visibleHydratedNewsletters = [...new Set(hydratedNewsletterSlugs)].map((slug) => {
      const newsletter = newsletters.find((currentNewsletter) => currentNewsletter.slug === slug);

      return {
        slug,
        name: newsletter?.name ?? slug,
      };
    });
    const hiddenHydratedNewsletters = visibleHydratedNewsletters.filter(
      (newsletter) => !activeNewsletterSlugs.has(newsletter.slug),
    );
    const offerOptions = buildOfferOptions(offers);
    const offerLabels = createOfferLabelMap(offers);
    const today = getTodayInTimezone(siteTimezone);

    const oneNewsletterOrFewer = activeNewsletters.length <= 1;
    const basicShown: Partial<Record<(typeof BASIC_ORDER)[number], boolean>> = {
      label: Boolean(labelValueSource),
      subscribed: oneNewsletterOrFewer,
      signup: membersTrackSources,
    };

    const basicFields = BASIC_ORDER.filter((key) => basicShown[key] ?? true).flatMap(
      (key): FilterFieldConfig[] => {
        switch (key) {
          case 'label':
            return [
              createFieldConfig(key, {
                ...createSearchableFieldOverrides([], labelValueSource),
                customRenderer: (props) =>
                  React.createElement(
                    LabelFilterRenderer,
                    props as React.ComponentProps<typeof LabelFilterRenderer>,
                  ),
              }),
            ];
          case 'subscribed':
            return [
              createFieldConfig(key),
              ...visibleHydratedNewsletters.map((newsletter) =>
                createFieldConfig(`newsletters.${newsletter.slug}`, { label: newsletter.name }),
              ),
            ];
          case 'last_seen_at':
          case 'created_at':
            return [createDateFieldConfig(key, today)];
          case 'signup':
            return [createFieldConfig(key, createSearchableFieldOverrides([], postValueSource))];
          default:
            return [createFieldConfig(key)];
        }
      },
    );

    groups.push({ group: 'Basic', fields: basicFields });

    // Each defined custom field is its own named entry, so a publisher can search
    // for "Shipping address" directly rather than reaching it through a generic
    // "Custom field" door. A simple field filters on its value; a composite field's
    // renderer opens its parts (plus "Any") in the pill.
    if (customFieldsEnabled) {
      const customFieldFields = customFields.map((field) =>
        createFieldConfig(`custom_fields.${field.key}`, {
          label: field.name,
          // The dropdown entry and the added filter show the field type's own icon
          // rather than a generic custom-field mark.
          icon: React.createElement(CustomFieldIcon, { type: field.type, className: 'size-4' }),
          // The field's type decides its parts and operators, so the operator
          // control lives in the renderer, after any part is chosen.
          renderOperatorInValue: true,
          customRenderer: (props) =>
            React.createElement(
              CustomFieldFilterRenderer,
              props as React.ComponentProps<typeof CustomFieldFilterRenderer>,
            ),
        }),
      );

      // An archived field the current filter still references: a disabled,
      // removable-only pill with an archive icon. Its key is already in the filter,
      // so the picker's own de-dup keeps it out of the add-list — it only ever
      // renders as an existing pill.
      const archivedFieldFields = archivedCustomFields.map((field) =>
        createFieldConfig(`custom_fields.${field.key}`, {
          label: field.name,
          icon: React.createElement(LucideIcon.Archive, { className: 'size-4' }),
          // Read-only: the operator and value stay visible so the segment reads
          // clearly, but the field is gone from the picker, so the pill can only
          // be removed, never re-edited.
          readOnly: true,
          renderOperatorInValue: true,
          customRenderer: (props) =>
            React.createElement(
              CustomFieldFilterRenderer,
              props as React.ComponentProps<typeof CustomFieldFilterRenderer>,
            ),
        }),
      );

      const allCustomFieldFields = [...customFieldFields, ...archivedFieldFields];

      // Nothing defined yet means nothing to filter on, so the group stays out of
      // the picker entirely rather than showing a section that can't be used.
      if (allCustomFieldFields.length > 0) {
        groups.push({
          group: 'Custom fields',
          fields: allCustomFieldFields,
          previewLimit: CUSTOM_FIELDS_PREVIEW_LIMIT,
        });
      }
    }

    if (activeNewsletters.length > 1) {
      const newsletterFields: FilterFieldConfig[] = [
        createFieldConfig('subscribed', {
          label: 'All newsletters',
          options: [
            { value: 'subscribed', label: 'Subscribed to at least one' },
            { value: 'unsubscribed', label: 'Unsubscribed from all' },
            { value: 'email-disabled', label: 'Email disabled' },
          ],
        }),
      ];

      for (const newsletter of activeNewsletters) {
        newsletterFields.push(
          createFieldConfig(`newsletters.${newsletter.slug}`, {
            label: newsletter.name,
          }),
        );
      }

      for (const newsletter of hiddenHydratedNewsletters) {
        newsletterFields.push(
          createFieldConfig(`newsletters.${newsletter.slug}`, {
            label: newsletter.name,
          }),
        );
      }

      groups.push({ group: 'Newsletters', fields: newsletterFields });
    }

    if (paidMembersEnabled) {
      const subscriptionShown: Partial<Record<(typeof SUBSCRIPTION_ORDER)[number], boolean>> = {
        tier_id: hasMultipleTiers,
        [MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FIELD]: multipleActiveSubscriptionsCount > 0,
        conversion: membersTrackSources,
        offer_redemptions: offers.length > 0,
      };

      const subscriptionFields = SUBSCRIPTION_ORDER.filter(
        (key) => subscriptionShown[key] ?? true,
      ).map((key) => {
        switch (key) {
          case 'tier_id':
            return createFieldConfig(key, createSearchableFieldOverrides([], tierValueSource));
          case 'status':
            return createFieldConfig(key, {
              options: [
                ...(fields.status?.options ?? []),
                { value: 'gift', label: 'Gift subscription' },
              ],
            });
          case 'subscriptions.start_date':
          case 'subscriptions.current_period_end':
            return createDateFieldConfig(key, today);
          case 'conversion':
            return createFieldConfig(key, createSearchableFieldOverrides([], postValueSource));
          case 'offer_redemptions':
            return createFieldConfig(key, {
              options: offerOptions,
              customValueRenderer: (values) =>
                renderOfferFilterValues(values as string[], offerOptions, offerLabels),
            });
          default:
            return createFieldConfig(key);
        }
      });

      groups.push({ group: 'Subscription', fields: subscriptionFields });
    }

    if (emailFiltersEnabled) {
      const emailShown: Partial<Record<(typeof EMAIL_ORDER)[number], boolean>> = {
        email_open_rate: emailTrackOpens,
        'opened_emails.post_id': emailTrackOpens,
        'clicked_links.post_id': emailTrackClicks,
      };
      const emailCounts = new Set<string>(['email_count', 'email_opened_count', 'email_open_rate']);

      const emailFields = EMAIL_ORDER.filter((key) => emailShown[key] ?? true).map((key) =>
        emailCounts.has(key)
          ? createFieldConfig(key)
          : createFieldConfig(key, createSearchableFieldOverrides([], emailValueSource)),
      );

      groups.push({ group: 'Email', fields: emailFields });
    }

    return groups;
  }, [
    fields,
    emailFiltersEnabled,
    emailValueSource,
    customFieldsEnabled,
    emailTrackClicks,
    emailTrackOpens,
    hasMultipleTiers,
    labelValueSource,
    membersTrackSources,
    multipleActiveSubscriptionsCount,
    newsletters,
    offers,
    hydratedNewsletterSlugs,
    paidMembersEnabled,
    postValueSource,
    siteTimezone,
    tierValueSource,
  ]);
}
