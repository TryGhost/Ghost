import { MobileFilterSheet } from './mobile-filter-sheet';
import { Button } from '@tryghost/shade/components';
import { METAFIELDS_FIELD_PREFIX } from '@/members/member-fields';
import { keyBelow } from '@/shared/filters';
import ManageViewPopover from './manage-view-popover';
import React, { useCallback, useMemo, useState } from 'react';
import { type Filter, FilterBar, Filters } from '@tryghost/shade/patterns';
import { createPortal } from 'react-dom';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import {
  buildOfferOptions,
  fromOfferFilterDisplayValues,
  toOfferFilterDisplayValues,
  useMemberFilterFields,
} from '@/members/use-member-filter-fields';
import {
  useBrowseSettings,
  useEmailTrackClicks,
  useEmailTrackOpens,
  useMembersTrackSources,
  useNewslettersEnabled,
  usePaidMembersEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useBrowseOffers } from '@tryghost/admin-x-framework/api/offers';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import { memberCustomFieldIdentity } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import {
  useEmailPostValueSource,
  useLabelValueSource,
  usePostResourceValueSource,
  useTierValueSource,
} from '@/shared/filter-sources';
import type { MemberView } from '@/members/hooks/use-member-views';

interface MembersFiltersProps {
  mobile?: boolean;
  mobileBarContainer?: HTMLElement | null;
  filters: Filter[];
  multipleActiveSubscriptionsCount: number;
  nql?: string;
  onFiltersChange: (filters: Filter[]) => void;
  savedViews?: MemberView[];
  activeView?: MemberView | null;
}

const EMPTY_OFFERS: typeof buildOfferOptions extends (offers: infer T) => unknown ? T : never = [];
const EMPTY_CUSTOM_FIELDS: MemberCustomField[] = [];
const EMPTY_NEWSLETTERS: NonNullable<
  ReturnType<typeof useBrowseNewsletters>['data']
>['newsletters'] = [];
const NO_KEYS: string[] = [];

// The keys a set of filters names under a given prefix.
//
// Keyed on the keys themselves rather than on the filters holding them, because these feed the
// field catalog, and rebuilding that means rebuilding every field's codec. Editing a filter
// almost never changes which newsletters or custom fields are named, and when it doesn't, this
// hands back the identical array and the catalog is left alone.
function useReferencedKeys(filters: Filter[], prefix: string): string[] {
  const signature = [
    ...new Set(
      filters
        .map((filter) => filter.field)
        .map((field) => keyBelow(field, prefix))
        .filter((name) => name !== null),
    ),
  ]
    .sort()
    .join('\n');

  return useMemo(() => (signature ? signature.split('\n') : NO_KEYS), [signature]);
}

function mapOfferRedemptionFilters(filters: Filter[], mapValues: (values: string[]) => string[]) {
  return filters.map((filter) => {
    if (filter.field !== 'offer_redemptions') {
      return filter;
    }

    return {
      ...filter,
      values: mapValues(filter.values as string[]),
    };
  });
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
  filters,
  mobile = false,
  mobileBarContainer,
  multipleActiveSubscriptionsCount,
  nql,
  onFiltersChange,
  savedViews = [],
  activeView,
}) => {
  const [backButtonContainer, setBackButtonContainer] = useState<HTMLSpanElement | null>(null);
  const { data: offersData } = useBrowseOffers({});
  const { data: newslettersData } = useBrowseNewsletters({ searchParams: { limit: '100' } });
  const { data: settingsData } = useBrowseSettings({});

  const settings = settingsData?.settings || [];
  const paidMembersEnabled = usePaidMembersEnabled() === true;
  // Email filters stay visible while settings load; only a settled 'disabled' hides them.
  const emailFiltersEnabled = useNewslettersEnabled() ?? true;
  const membersTrackSources = useMembersTrackSources() === true;
  const emailTrackOpens = useEmailTrackOpens() === true;
  const emailTrackClicks = useEmailTrackClicks() === true;
  const siteTimezone = getSiteTimezone(settings);

  const newsletters = newslettersData?.newsletters ?? EMPTY_NEWSLETTERS;
  const offers = useMemo(() => offersData?.offers ?? EMPTY_OFFERS, [offersData?.offers]);

  const offersOptions = useMemo(() => {
    return buildOfferOptions(offers);
  }, [offers]);
  const hydratedNewsletterSlugs = useReferencedKeys(filters, 'newsletters.');

  const displayFilters = useMemo(() => {
    return mapOfferRedemptionFilters(filters, (values) =>
      toOfferFilterDisplayValues(values, offersOptions),
    );
  }, [filters, offersOptions]);

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      onFiltersChange(
        mapOfferRedemptionFilters(newFilters, (values) =>
          fromOfferFilterDisplayValues(values, offersOptions),
        ),
      );
    },
    [onFiltersChange, offersOptions],
  );

  const postValueSource = usePostResourceValueSource();
  const emailValueSource = useEmailPostValueSource();
  const labelValueSource = useLabelValueSource();
  const { valueSource: tierValueSource, hasMultipleTiers } = useTierValueSource();
  // The archived-inclusive browse, fetched eagerly: this is the query the hydration gate
  // in Members waits on once a filter names a custom field, and a pill reaches the URL on
  // the first keystroke — if the gate finds this cache cold it unmounts the whole page to
  // a spinner mid-interaction. A field can only be picked after this has answered, so
  // fetching it here is what keeps that wait confined to fresh page loads. Archived
  // fields ride along so a saved segment on a since-archived field still renders its
  // read-only pill.
  const { data: customFieldsData } = useCustomFieldDefinitionsIncludingArchived();
  const catalogCustomFields = customFieldsData ?? EMPTY_CUSTOM_FIELDS;
  // The picker offers active fields only.
  const customFields = useMemo(
    () => catalogCustomFields.filter((field) => field.status === 'active'),
    [catalogCustomFields],
  );
  const referencedCustomFieldIdentities = useReferencedKeys(filters, METAFIELDS_FIELD_PREFIX);
  const referencedIdentities = useMemo(
    () => new Set(referencedCustomFieldIdentities),
    [referencedCustomFieldIdentities],
  );
  const archivedCustomFields = useMemo(
    () =>
      catalogCustomFields.filter(
        (field) =>
          field.status === 'archived' && referencedIdentities.has(memberCustomFieldIdentity(field)),
      ),
    [catalogCustomFields, referencedIdentities],
  );

  const filterFields = useMemberFilterFields({
    newsletters,
    hydratedNewsletterSlugs,
    hasMultipleTiers,
    paidMembersEnabled,
    emailFiltersEnabled,
    labelValueSource,
    tierValueSource,
    offers,
    multipleActiveSubscriptionsCount,
    postValueSource,
    emailValueSource,
    membersTrackSources,
    emailTrackOpens,
    emailTrackClicks,
    siteTimezone,
    customFields,
    archivedCustomFields,
  });

  const filterChips = useMemo(() => {
    const fields = filterFields.flatMap((group) => group.fields);
    return displayFilters.map((filter) => {
      const field = fields.find((candidate) => candidate.key === filter.field);
      const label = field?.pillLabel ?? field?.label ?? 'Filter';
      const values = filter.values.map((value) => {
        const option = field?.options?.find((candidate) => candidate.value === value);
        return (
          option?.label ??
          (['text', 'email', 'url', 'tel', 'date', 'datetime', 'time'].includes(
            field?.type ?? '',
          ) && typeof value === 'string'
            ? value.trim()
            : '')
        );
      });
      const operator = field?.operators?.find(
        (candidate) => candidate.value === filter.operator,
      )?.label;
      const text =
        values.length && values.every(Boolean)
          ? `${label}${operator ? ` ${operator}` : ':'} ${values.join(', ')}`
          : label;
      const valueText = values.length && values.every(Boolean) ? values.join(', ') : '';
      const qualifier = !['is', 'contains', 'is-any'].includes(filter.operator) ? operator : '';
      return {
        id: filter.id,
        icon: field?.icon,
        label: valueText ? `${qualifier ? `${qualifier} ` : ''}${valueText}` : label,
        description: text,
      };
    });
  }, [displayFilters, filterFields]);

  const hasFilters = filters.length > 0;

  const clearAndSaveButtons = hasFilters ? (
    <FilterBar.Actions data-testid="members-filter-actions" gap="sm">
      <FilterBar.Action
        className="hidden items-center lg:inline-flex"
        type="button"
        variant="ghost"
        onClick={() => onFiltersChange([])}
      >
        Clear
      </FilterBar.Action>
      {nql && (
        <ManageViewPopover
          activeView={activeView}
          existingViews={savedViews}
          filter={nql}
          onDeleted={() => onFiltersChange([])}
        />
      )}
    </FilterBar.Actions>
  ) : undefined;

  const filterControls = (
    <Filters
      addButton={
        mobile ? (
          <Button
            className="shrink-0 px-0 [@media(hover:none)]:hover:bg-transparent"
            variant="ghost"
          >
            <LucideIcon.Plus /> Add filter
          </Button>
        ) : (
          <Filters.Trigger />
        )
      }
      allowMultiple={true}
      className={cn(
        mobile
          ? [
              'w-full flex-col items-stretch gap-3',
              '[&_[data-slot=filter-item]]:w-full [&_[data-slot=filter-item]]:min-w-0',
              '[&_[data-slot=filter-item]>:nth-last-child(2)]:min-w-0 [&_[data-slot=filter-item]>:nth-last-child(2)]:flex-1 [&_[data-slot=filter-item]>:nth-last-child(2)]:overflow-hidden',
              '[&_[data-slot=filter-item]_input]:min-w-0 [&_[data-slot=filters-input-wrapper]]:min-w-0 [&_[data-slot=filters-input-wrapper]]:flex-1',
              '[&_[cmdk-group-heading]]:px-0! [&_[cmdk-group]]:px-0 [&_[cmdk-input-wrapper]]:px-0 [&_[cmdk-item]]:px-0 [&_[data-slot=command-list]]:px-0',
              '[&_[cmdk-input]]:text-base [&_[cmdk-item]]:min-h-10 [&_[cmdk-root]]:h-auto [&_[data-slot=command-list]]:max-h-none',
            ]
          : ['[&>button]:order-last', hasFilters ? 'sm:!pr-40' : 'w-auto'],
      )}
      clearButton={mobile ? undefined : clearAndSaveButtons}
      fields={filterFields}
      filters={displayFilters}
      inlineActions={
        mobile && nql ? (
          <ManageViewPopover
            activeView={activeView}
            existingViews={savedViews}
            filter={nql}
            onDeleted={() => onFiltersChange([])}
          />
        ) : undefined
      }
      inlinePicker={mobile}
      keyboardShortcut="f"
      popoverAlign={'start'}
      popoverContentClassName={
        mobile
          ? 'z-[80] w-[min(360px,calc(100vw-32px))] max-h-(--radix-popover-content-available-height) [&_[data-slot=command-list]]:max-h-[min(450px,50dvh)]'
          : 'z-[80] w-[280px] [&_[data-slot=command-list]]:max-h-[450px]'
      }
      renderPickerBack={
        mobile
          ? (onBack) =>
              backButtonContainer &&
              createPortal(
                <Button
                  aria-label="Back"
                  className="-my-3 -mr-2 -ml-3 size-11 p-0 hover:bg-transparent"
                  variant="ghost"
                  onClick={onBack}
                >
                  <LucideIcon.ArrowLeft />
                </Button>,
                backButtonContainer,
              )
          : undefined
      }
      showClearButton={!mobile && hasFilters}
      showSearchInput={true}
      onChange={handleFiltersChange}
    />
  );

  if (mobile) {
    return (
      <MobileFilterSheet
        backButtonRef={setBackButtonContainer}
        barContainer={mobileBarContainer}
        chips={filterChips}
        count={filters.length}
        onClear={() => onFiltersChange([])}
      >
        {filterControls}
      </MobileFilterSheet>
    );
  }

  return filterControls;
};

export default MembersFilters;
