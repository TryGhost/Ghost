import { METAFIELDS_FIELD_PREFIX } from '@/members/member-fields';
import { keyBelow } from '@/shared/filters';
import ManageViewPopover from './manage-view-popover';
import React, { useCallback, useMemo } from 'react';
import { Button } from '@tryghost/shade/components';
import { type Filter, Filters } from '@tryghost/shade/patterns';
import { LucideIcon, cn } from '@tryghost/shade/utils';
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
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import {
  useEmailPostValueSource,
  useLabelValueSource,
  usePostResourceValueSource,
  useTierValueSource,
} from '@/shared/filter-sources';
import type { MemberView } from '@/members/hooks/use-member-views';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

interface MembersFiltersProps {
  filters: Filter[];
  multipleActiveSubscriptionsCount: number;
  nql?: string;
  onFiltersChange: (filters: Filter[]) => void;
  savedViews?: MemberView[];
  activeView?: MemberView | null;
  iconOnly?: boolean;
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
  multipleActiveSubscriptionsCount,
  nql,
  onFiltersChange,
  savedViews = [],
  activeView,
  iconOnly = false,
}) => {
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
  const referencedCustomFieldKeys = useMemo(
    () => new Set(referencedCustomFieldIdentities),
    [referencedCustomFieldIdentities],
  );
  const archivedCustomFields = useMemo(
    () =>
      catalogCustomFields
        .filter(
          (field) =>
            field.status === 'archived' &&
            referencedCustomFieldKeys.has(`${field.namespace}.${field.key}`),
        )
        .map((field) => ({ namespace: field.namespace, key: field.key, name: field.name })),
    [catalogCustomFields, referencedCustomFieldKeys],
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

  const hasFilters = filters.length > 0;
  const useConsolidatedFilterUI = useFeatureFlag('postsListReact');
  const showIconOnlyTrigger = iconOnly && !hasFilters;
  const addFilterButtonClassName = cn(
    'bg-white dark:bg-background',
    showIconOnlyTrigger &&
      'min-w-[34px] gap-0 !px-3 text-[0px] lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-base',
  );

  const clearAndSaveButtons = hasFilters ? (
    <div className="flex shrink-0 items-center gap-4 sm:absolute sm:top-0 sm:right-0">
      <Button
        className={cn(
          'hidden items-center text-muted-foreground hover:text-foreground lg:inline-flex',
          !useConsolidatedFilterUI && 'gap-1 !px-0 text-sm font-normal hover:bg-transparent',
        )}
        type="button"
        variant={useConsolidatedFilterUI ? 'outline' : 'ghost'}
        onClick={() => onFiltersChange([])}
      >
        <LucideIcon.X className="size-4" />
        Clear
      </Button>
      {nql && (
        <ManageViewPopover
          activeView={activeView}
          existingViews={savedViews}
          filter={nql}
          onDeleted={() => onFiltersChange([])}
        />
      )}
    </div>
  ) : undefined;

  return (
    <Filters
      addButtonClassName={addFilterButtonClassName}
      addButtonIcon={
        useConsolidatedFilterUI ? (
          hasFilters ? (
            <LucideIcon.ListFilterPlus className="size-4" />
          ) : (
            <LucideIcon.ListFilter className="size-4" />
          )
        ) : hasFilters ? (
          <LucideIcon.FunnelPlus />
        ) : (
          <LucideIcon.Funnel />
        )
      }
      addButtonText={hasFilters ? 'Add filter' : 'Filter'}
      allowMultiple={true}
      className={cn(
        '[&>button]:order-last',
        hasFilters ? 'sm:!pr-40 [&>button]:border-none' : 'w-auto',
      )}
      clearButton={clearAndSaveButtons}
      fields={filterFields}
      filters={displayFilters}
      keyboardShortcut="f"
      popoverAlign={'start'}
      popoverContentClassName="z-[80] w-[280px] [&_[data-slot=command-list]]:max-h-[450px]"
      showClearButton={hasFilters}
      showSearchInput={true}
      onChange={handleFiltersChange}
    />
  );
};

export default MembersFilters;
