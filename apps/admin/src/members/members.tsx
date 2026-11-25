import { useMobileFilters } from '@tryghost/shade/patterns';
import MembersActions from './components/members-actions';
import MembersEmptyState from './components/members-empty-state';
import MembersFilters from './components/members-filters';
import MembersHeaderSearch from './components/members-header-search';
import MembersHelpCards from './components/members-help-cards';
import MembersList from './components/members-list';
import MultipleActiveSubscriptionsBanner from './components/multiple-active-subscriptions-banner';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { FilterBar, PageHeader } from '@tryghost/shade/patterns';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage, usePageChrome } from '@tryghost/shade/page-templates';
import { keepPreviousData } from '@tanstack/react-query';
import { LucideIcon, cn, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { buildMemberListSearchParams, getMemberActiveColumns } from './member-query-params';
import { canBulkDeleteMembers, shouldShowMembersLoading } from './members-view-state';
import {
  checkStripeEnabled,
  getSettingValue,
  useBrowseSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  shouldDelayMembersFilterHydration,
  useMembersFilterState,
} from './hooks/use-members-filter-state';
import { useMemberFilterSources } from './hooks/use-member-filter-sources';
import {
  useActiveMemberView,
  useCanChangeMemberViews,
  useMemberViews,
} from './hooks/use-member-views';
import { ManageSegmentsDialog } from './segments/manage-segments-dialog';
import { MemberSegmentActions } from './segments/member-segment-actions';
import { PocControls } from './segments/poc-controls';
import { SEGMENT_PARAM, buildSegmentUrl } from './segments/segment-route';
import { SegmentSwitcher } from './segments/segment-switcher';
import { useSegmentFacts } from './segments/use-segment-facts';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseMembersInfinite } from '@tryghost/admin-x-framework/api/members';
import { useDebouncedCallback } from 'use-debounce';
import { useLocation, useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useMultipleActiveSubscriptionsCount } from './hooks/use-multiple-active-subscriptions-count';
import { useIdlePreload } from '@/shared/use-idle-preload';
import { preloadMapAtlas } from './detail/map-atlas';

const SEARCH_DEBOUNCE_MS = 250;
const MEMBERS_HELP_CARDS_LIMIT = 6;

interface MembersPageProps {
  emailAnalyticsEnabled: boolean;
  hasStripeEnabled: boolean;
  membershipsEnabled: boolean;
  timezone: string;
}

const MembersPage: React.FC<MembersPageProps> = ({
  emailAnalyticsEnabled,
  hasStripeEnabled,
  membershipsEnabled,
  timezone,
}) => {
  // Under a large title (admin7Design), a roomier row of column labels
  const { largeTitles } = usePageChrome();
  const mobileFilters = useMobileFilters();
  const [mobileFilterBar, setMobileFilterBar] = useState<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const setHeaderContentRef = useCallback((node: HTMLDivElement | null) => {
    headerRef.current = node?.closest('[data-list-page="header"]') as HTMLDivElement | null;
  }, []);
  // Names the custom field columns, and gives the filter catalog the definitions that let a
  // saved filter on a custom field be read precisely. Archived fields are included so a filter
  // on one still shows its values, matching the read-only pill the filter bar renders for it.
  //
  const [filterSearchParams, setFilterSearchParams] = useSearchParams();
  const { newsletters, customFields } = useMemberFilterSources(
    filterSearchParams.get('filter') ?? undefined,
  );
  const { filters, nql, search, setFilters, setSearch, hasFilterOrSearch, clearAll } =
    useMembersFilterState(timezone, newsletters, customFields);
  const location = useLocation();
  const navigate = useNavigate();
  const savedViews = useMemberViews();
  const activeView = useActiveMemberView(savedViews, nql);
  // The segment the screen is showing: the one its URL names, so it is still known once its
  // filters are changed, or else the one whose filter is applied, as older links have no id.
  const segmentParam = filterSearchParams.get(SEGMENT_PARAM);
  const appliedFilter = filterSearchParams.get('filter') ?? undefined;
  const viewedSegment = savedViews.find(({ id }) => id === segmentParam) ?? activeView;
  const isSegmentModified = Boolean(viewedSegment && appliedFilter !== viewedSegment.filter);
  const canChangeSegments = useCanChangeMemberViews();
  const factsOf = useSegmentFacts(savedViews);

  // With its filters cleared the screen shows every member, which is no longer the segment.
  useEffect(() => {
    if (segmentParam && !appliedFilter) {
      const next = new URLSearchParams(filterSearchParams);
      next.delete(SEGMENT_PARAM);
      setFilterSearchParams(next, { replace: true });
    }
  }, [segmentParam, appliedFilter, filterSearchParams, setFilterSearchParams]);
  const [showMobileSearch, setShowMobileSearch] = useState(search.length > 0);
  const [mobileSearchOpenedByUser, setMobileSearchOpenedByUser] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const commitSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, SEARCH_DEBOUNCE_MS);

  // Fetched once at page level so the banner, and both filter bar instances,
  // share a single request per visit and always agree on the count.
  const {
    count: multipleActiveSubscriptionsCount,
    hasResolvedCount: hasResolvedMultipleActiveSubscriptionsCount,
  } = useMultipleActiveSubscriptionsCount({ enabled: hasStripeEnabled });

  const activeColumns = useMemo(() => {
    return getMemberActiveColumns(filters, { customFields });
  }, [filters, customFields]);

  const canBulkDelete = useMemo(() => {
    return canBulkDeleteMembers(filters, nql);
  }, [filters, nql]);

  const searchParams = useMemo(() => {
    return buildMemberListSearchParams({
      filters,
      nql,
      search,
    });
  }, [filters, nql, search]);

  const { data, isError, isFetching, isFetchingNextPage, refetch, fetchNextPage, hasNextPage } =
    useBrowseMembersInfinite({
      searchParams,
      placeholderData: keepPreviousData,
    });

  const shouldShowLoading = shouldShowMembersLoading({
    isFetching,
    isFetchingNextPage,
  });

  const totalMembers = data?.meta?.pagination?.total ?? 0;
  const hasFilters = filters.length > 0;

  // A new segment starts by filtering the list: the filters and the list are what builds one,
  // and it is saved from the filter bar. What "New segment" does depends on what is on screen,
  // and it never throws away filters that haven't been saved:
  // - filters that are no segment's, or a segment's changed ones, are what the new segment is
  //   made of, so it asks for their name
  // - a segment shown as it is saved is left for a fresh start on every member
  // - with no filters, the filter control opens
  // POC: the control only opens to its own shortcut, which is sent to it here.
  const filterPickerWanted = useRef(false);
  const [saveRequest, setSaveRequest] = useState(0);
  const [managingSegments, setManagingSegments] = useState(false);
  const openFilterPicker = useCallback(() => {
    window.setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' })), 50);
  }, []);
  const startNewSegment = () => {
    if (nql && (!viewedSegment || isSegmentModified)) {
      setSaveRequest((request) => request + 1);
    } else if (viewedSegment) {
      filterPickerWanted.current = true;
      navigate('/members');
    } else {
      openFilterPicker();
    }
  };
  useEffect(() => {
    if (filterPickerWanted.current && !hasFilters) {
      filterPickerWanted.current = false;
      openFilterPicker();
    }
  }, [hasFilters, openFilterPicker]);
  const shouldShowMobileSearchRow = showMobileSearch;
  const shouldShowFiltersRow = hasFilters;
  const shouldShowMemberControls = hasFilterOrSearch || totalMembers > 0;
  const shouldShowMembersHelpCards =
    !hasFilterOrSearch && !shouldShowLoading && !isError && totalMembers < MEMBERS_HELP_CARDS_LIMIT;

  // Keep the input in sync with the committed search whenever it changes for
  // any reason other than typing (browser back/forward, "Show all members",
  // saved views), and drop any pending commit so the new value wins instead
  // of being overwritten by a stale keystroke.
  useEffect(() => {
    setSearchInput(search);
    commitSearch.cancel();
    if (search) {
      setShowMobileSearch(true);
    }
  }, [search, commitSearch]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    commitSearch(value);
  };

  const handleMobileSearchToggle = () => {
    if (showMobileSearch) {
      setShowMobileSearch(false);
      setMobileSearchOpenedByUser(false);
      return;
    }

    setMobileSearchOpenedByUser(true);
    setShowMobileSearch(true);
  };

  // The filters and their actions are the bar's two items, side by side at every width, with
  // the actions at the top right as they have always been. The bar was set to stack below `lg`,
  // which did nothing while it had one item and would now drop the actions under the filters.
  const filtersClassName = 'flex-row items-start gap-4';
  const handleShowAllMembers = () => {
    commitSearch.cancel();
    setSearchInput('');
    clearAll({ replace: false });
  };

  const segmentActions = nql ? (
    <MemberSegmentActions
      filter={nql}
      isModified={isSegmentModified}
      saveRequest={saveRequest}
      segment={viewedSegment}
      onLeaveSegment={() => navigate('/members')}
      onOpenSegment={(segment) => navigate(buildSegmentUrl(segment))}
    />
  ) : undefined;

  // While a segment's filters are changed, the bar's clear button puts them back instead.
  const clearAction =
    viewedSegment && isSegmentModified
      ? { label: 'Reset', onSelect: () => navigate(buildSegmentUrl(viewedSegment)) }
      : undefined;

  // What the header says about the segment being shown: who made it, and when. What uses it is
  // said where it matters, when the segment is about to be changed or deleted.
  // Both read the same way, "Created 25 Nov by Ada", and the second is the latest change, so it
  // says so.
  const segmentFacts = viewedSegment ? factsOf(viewedSegment.id) : null;
  const dated = (what: string, at: string | undefined, by: string | undefined) =>
    at && `${what} ${formatDisplayDate(at, timezone)}${by ? ` by ${by}` : ''}`;
  const segmentMeta = [
    dated('Created', segmentFacts?.createdAt, segmentFacts?.createdBy),
    dated('Last edited', segmentFacts?.editedAt, segmentFacts?.editedBy),
  ]
    .filter(Boolean)
    .join(' · ');

  const headerSearch = shouldShowMemberControls && (
    <>
      <Box className="hidden lg:flex">
        <MembersHeaderSearch search={searchInput} collapsible onSearchChange={handleSearchChange} />
      </Box>
      <PageHeader.Action
        aria-expanded={showMobileSearch}
        className="lg:hidden"
        label={showMobileSearch ? 'Hide member search' : 'Show member search'}
        iconOnly
        onClick={handleMobileSearchToggle}
      >
        <LucideIcon.Search />
      </PageHeader.Action>
    </>
  );

  const headerFilters = shouldShowMemberControls && (!hasFilters || mobileFilters) && (
    <MembersFilters
      clearAction={clearAction}
      filters={filters}
      mobileBarContainer={mobileFilterBar}
      multipleActiveSubscriptionsCount={multipleActiveSubscriptionsCount}
      segmentActions={segmentActions}
      onFiltersChange={setFilters}
    />
  );

  const mobileSearchRow = shouldShowMemberControls && shouldShowMobileSearchRow && (
    <Box className="w-full lg:hidden">
      <MembersHeaderSearch
        ariaLabel="Search members mobile"
        autoFocus={mobileSearchOpenedByUser}
        search={searchInput}
        onSearchChange={handleSearchChange}
      />
    </Box>
  );

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage
          className={cn(
            largeTitles && '[&_[data-testid=members-list-scroll-root]>div:first-child_th]:h-11',
          )}
          data-testid="members-page"
        >
          {/* Under the Admin 7 design the header is pulled up over the large title, so its
              buttons sit beside it. The title is a button here, so the header lets clicks
              through to it until it has scrolled into the header's place, and keeps its own
              buttons and the rows under it clickable. */}
          <ListPage.Header className="py-4 sidebar:py-5 [&_[data-page-header=actions]]:pointer-events-auto [&_[data-page-header=page-header]~*]:pointer-events-auto [&[data-large-title-header]:not([data-condensed])]:pointer-events-none">
            <div ref={setHeaderContentRef} className="flex flex-col gap-4 sidebar:gap-6">
              <PageHeader blurredBackground={false} sticky={false}>
                {/* A segment's facts can be a long line. The title block takes the room left by
                    the actions and cuts the line short, rather than pushing them to a row below. */}
                <PageHeader.Left className={viewedSegment ? 'min-w-48 flex-1 basis-0' : undefined}>
                  {/* The title is a row of its own, as tall as the header's buttons, with the
                      title centred in it. It is then in the same place whether or not a segment's
                      facts follow: they are added under the row and only make the header taller. */}
                  <PageHeader.Title className="flex h-(--control-height) items-center">
                    {/* One item of that row, so the title and its count still read as a line
                        of text, on one baseline, as they did before. */}
                    <span className="min-w-0">
                      <SegmentSwitcher
                        current={viewedSegment}
                        segments={savedViews}
                        onNewSegment={canChangeSegments ? startNewSegment : undefined}
                      />{' '}
                      {!shouldShowLoading && totalMembers > 0 && (
                        <PageHeader.Count className="hidden sm:inline">
                          {formatNumber(totalMembers)}
                        </PageHeader.Count>
                      )}
                    </span>
                    {viewedSegment && segmentMeta && (
                      <PageHeader.Meta className="truncate">{segmentMeta}</PageHeader.Meta>
                    )}
                  </PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                  <PageHeader.ActionGroup className="ml-auto flex-wrap justify-end sm:ml-0 sm:flex-nowrap">
                    {headerSearch}
                    {mobileFilters && headerFilters}
                    <MembersActions
                      canBulkDelete={canBulkDelete}
                      hasFilterOrSearch={hasFilterOrSearch}
                      memberCount={totalMembers}
                      nql={nql}
                      search={search}
                      showMenu={shouldShowMemberControls}
                      showNewMember={shouldShowMemberControls}
                      onImportComplete={() => {
                        void refetch();
                      }}
                      onManageSegments={() => setManagingSegments(true)}
                    >
                      {!mobileFilters && headerFilters}
                    </MembersActions>
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              </PageHeader>

              {mobileSearchRow}
              {shouldShowMemberControls && mobileFilters && hasFilters && (
                <div ref={setMobileFilterBar} />
              )}
              {shouldShowMemberControls && shouldShowFiltersRow && !mobileFilters && (
                <FilterBar className={filtersClassName}>
                  <MembersFilters
                    clearAction={clearAction}
                    filters={filters}
                    multipleActiveSubscriptionsCount={multipleActiveSubscriptionsCount}
                    segmentActions={segmentActions}
                    onFiltersChange={setFilters}
                  />
                </FilterBar>
              )}
              {hasStripeEnabled && (
                <MultipleActiveSubscriptionsBanner
                  count={multipleActiveSubscriptionsCount}
                  hasResolvedCount={hasResolvedMultipleActiveSubscriptionsCount}
                  nql={nql}
                  search={search}
                />
              )}
            </div>
          </ListPage.Header>
          <ListPage.Body>
            {shouldShowLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <LoadingIndicator size="lg" />
              </div>
            ) : isError ? (
              <div className="mb-16 flex flex-1 flex-col items-center justify-center">
                <h2 className="mb-2 text-xl font-medium">Error loading members</h2>
                <p className="mb-4 text-muted-foreground">Please reload the page to try again</p>
                <Button onClick={() => window.location.reload()}>Reload page</Button>
              </div>
            ) : !data?.members.length ? (
              hasFilterOrSearch ? (
                <div className="flex flex-1 flex-col items-center justify-center">
                  <EmptyIndicator
                    actions={
                      <Button variant="outline" onClick={handleShowAllMembers}>
                        Show all members
                      </Button>
                    }
                    title="No matching members found."
                  >
                    <LucideIcon.Users />
                  </EmptyIndicator>
                </div>
              ) : (
                <MembersEmptyState
                  membershipsEnabled={membershipsEnabled}
                  onMemberCreated={async () => {
                    await refetch();
                  }}
                />
              )
            ) : (
              <MembersList
                activeColumns={activeColumns}
                backPath={`${location.pathname}${location.search}`}
                fetchNextPage={() => void fetchNextPage()}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isFetching && !isFetchingNextPage}
                items={data.members}
                pageHeaderRef={headerRef}
                showEmailOpenRate={emailAnalyticsEnabled}
                timezone={timezone}
                totalItems={totalMembers}
              />
            )}
            {shouldShowMembersHelpCards && (
              <div className={cn(data?.members.length && 'mt-8')}>
                <MembersHelpCards />
              </div>
            )}
          </ListPage.Body>
        </ListPage>
        {managingSegments && (
          <ManageSegmentsDialog
            open
            onNewSegment={canChangeSegments ? startNewSegment : undefined}
            onOpenChange={setManagingSegments}
            onOpenSegment={(segment) => navigate(buildSegmentUrl(segment))}
          />
        )}
        <PocControls onSegmentCreated={(segment) => navigate(buildSegmentUrl(segment))} />
      </Container>
    </Box>
  );
};

const Members: React.FC = () => {
  const [searchParams] = useSearchParams();
  // A member's page draws a map behind its header; fetching the atlas now means
  // it is usually there before the admin opens one.
  useIdlePreload(preloadMapAtlas, true);
  const { data: settingsData, isLoading: isSettingsLoading } = useBrowseSettings({});
  const { data: configData, isLoading: isConfigLoading } = useBrowseConfig();
  const filterParam = searchParams.get('filter') ?? undefined;
  const hasResolvedSettings = Boolean(settingsData?.settings);

  const { newsletters: gateNewsletters, customFields: gateCustomFields } =
    useMemberFilterSources(filterParam);

  const shouldDelayHydration = shouldDelayMembersFilterHydration(filterParam, {
    hasResolvedSettings,
    isLoadingSettings: isSettingsLoading,
    newsletters: gateNewsletters,
    customFields: gateCustomFields,
  });

  if (
    isSettingsLoading ||
    isConfigLoading ||
    !settingsData?.settings ||
    !configData?.config ||
    shouldDelayHydration
  ) {
    return (
      <Box className="size-full">
        <Container className="relative flex h-full flex-col" size="page">
          <ListPage>
            <ListPage.Header className="py-4 sidebar:py-6">
              <PageHeader blurredBackground={false} sticky={false}>
                <PageHeader.Left>
                  <PageHeader.Title>Members</PageHeader.Title>
                </PageHeader.Left>
              </PageHeader>
            </ListPage.Header>
            <ListPage.Body>
              <div className="flex flex-1 items-center justify-center">
                <LoadingIndicator size="lg" />
              </div>
            </ListPage.Body>
          </ListPage>
        </Container>
      </Box>
    );
  }

  const timezone = getSiteTimezone(settingsData.settings);
  const membersSignupAccess = getSettingValue<string>(
    settingsData.settings,
    'members_signup_access',
  );
  const membershipsEnabled = membersSignupAccess !== 'none';
  const emailAnalyticsEnabled = configData.config.emailAnalytics === true;
  const hasStripeEnabled = checkStripeEnabled(settingsData.settings, configData.config);

  return (
    <MembersPage
      emailAnalyticsEnabled={emailAnalyticsEnabled}
      hasStripeEnabled={hasStripeEnabled}
      membershipsEnabled={membershipsEnabled}
      timezone={timezone}
    />
  );
};

export default Members;
