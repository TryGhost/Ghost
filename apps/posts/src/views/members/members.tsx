import MainLayout from '@components/layout/main-layout';
import MembersActions from './components/members-actions';
import MembersEmptyState from './components/members-empty-state';
import MembersFilters from './components/members-filters';
import MembersHeaderSearch from './components/members-header-search';
import MembersHelpCards from './components/members-help-cards';
import MembersList from './components/members-list';
import MultipleActiveSubscriptionsBanner from './components/multiple-active-subscriptions-banner';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {FilterBar, PageHeader} from '@tryghost/shade/patterns';
import {ListPage} from '@tryghost/shade/page-templates';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import {buildMemberListSearchParams, getMemberActiveColumns} from './member-query-params';
import {canBulkDeleteMembers, shouldShowMembersLoading} from './members-view-state';
import {checkStripeEnabled, getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {isMultipleActiveSubscriptionsPredicate} from './multiple-active-subscriptions';
import {shouldDelayMembersDateFilterHydration, useMembersFilterState} from './hooks/use-members-filter-state';
import {useActiveMemberView, useMemberViews} from './hooks/use-member-views';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {useDebouncedCallback} from 'use-debounce';
import {useLocation, useSearchParams} from 'react-router';

const SEARCH_DEBOUNCE_MS = 250;
const MEMBERS_HELP_CARDS_LIMIT = 6;

interface MembersPageProps {
    emailAnalyticsEnabled: boolean;
    hasStripeEnabled: boolean;
    membershipsEnabled: boolean;
    multipleSubsFilterEnabled: boolean;
    timezone: string;
}

const MembersPage: React.FC<MembersPageProps> = ({
    emailAnalyticsEnabled,
    hasStripeEnabled,
    membershipsEnabled,
    multipleSubsFilterEnabled,
    timezone
}) => {
    const headerRef = useRef<HTMLDivElement | null>(null);
    const setHeaderContentRef = useCallback((node: HTMLDivElement | null) => {
        headerRef.current = node?.closest('[data-list-page="header"]') as HTMLDivElement | null;
    }, []);
    const {filters, nql, search, setFilters, setSearch, hasFilterOrSearch, clearAll} = useMembersFilterState(timezone);
    const location = useLocation();
    const savedViews = useMemberViews();
    const activeView = useActiveMemberView(savedViews, nql);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileSearchOpenedByUser, setMobileSearchOpenedByUser] = useState(false);
    const [searchInput, setSearchInput] = useState(search);
    const commitSearch = useDebouncedCallback((value: string) => {
        setSearch(value);
    }, SEARCH_DEBOUNCE_MS);

    // The multiple active subscriptions predicate is applied via the banner's
    // "View members" link and has no filter UI, so keep it out of the filter bar.
    const visibleFilters = useMemo(() => {
        return filters.filter(filter => !isMultipleActiveSubscriptionsPredicate(filter));
    }, [filters]);

    const activeColumns = useMemo(() => {
        return getMemberActiveColumns(filters);
    }, [filters]);

    const canBulkDelete = useMemo(() => {
        return canBulkDeleteMembers(filters, nql);
    }, [filters, nql]);

    const searchParams = useMemo(() => {
        return buildMemberListSearchParams({
            filters,
            nql,
            search
        });
    }, [filters, nql, search]);

    const {
        data,
        isError,
        isFetching,
        isFetchingNextPage,
        refetch,
        fetchNextPage,
        hasNextPage
    } = useBrowseMembersInfinite({
        searchParams,
        keepPreviousData: true
    });

    const shouldShowLoading = shouldShowMembersLoading({
        isFetching,
        isFetchingNextPage
    });

    const totalMembers = data?.meta?.pagination?.total ?? 0;
    const hasFilters = visibleFilters.length > 0;
    const shouldShowMobileSearchRow = showMobileSearch;
    const shouldShowFiltersRow = hasFilters;
    const shouldShowMemberControls = hasFilterOrSearch || totalMembers > 0;
    const shouldShowMembersHelpCards = !hasFilterOrSearch && !shouldShowLoading && !isError && totalMembers < MEMBERS_HELP_CARDS_LIMIT;

    // Keep the input in sync with the committed search whenever it changes for
    // any reason other than typing (browser back/forward, "Show all members",
    // saved views), and drop any pending commit so the new value wins instead
    // of being overwritten by a stale keystroke.
    useEffect(() => {
        setSearchInput(search);
        commitSearch.cancel();
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

    const filtersClassName = 'flex-col gap-4 lg:flex-row lg:items-center sidebar:gap-6 lg:gap-6';
    const handleShowAllMembers = () => {
        commitSearch.cancel();
        setSearchInput('');
        clearAll({replace: false});
    };

    return (
        <MainLayout>
            <ListPage data-testid="members-page">
                <ListPage.Header className="py-4 sidebar:py-5">
                    <div ref={setHeaderContentRef} className="flex flex-col gap-4 sidebar:gap-6">
                        <PageHeader
                            blurredBackground={false}
                            sticky={false}
                        >
                            <PageHeader.Left>
                                <PageHeader.Title>
                                    Members{' '}
                                    {!shouldShowLoading && totalMembers > 0 && (
                                        <PageHeader.Count className="hidden sm:inline">
                                            {formatNumber(totalMembers)}
                                        </PageHeader.Count>
                                    )}
                                </PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup className="ml-auto flex-wrap justify-end sm:ml-0 sm:flex-nowrap">
                                    {shouldShowMemberControls && (
                                        <>
                                            <div className="hidden lg:flex">
                                                <MembersHeaderSearch
                                                    search={searchInput}
                                                    onSearchChange={handleSearchChange}
                                                />
                                            </div>
                                            <Button
                                                aria-label={showMobileSearch ? 'Hide member search' : 'Show member search'}
                                                className={cn('lg:hidden', showMobileSearch && 'bg-secondary hover:bg-secondary')}
                                                variant="outline"
                                                onClick={handleMobileSearchToggle}
                                            >
                                                <LucideIcon.Search className="size-4" />
                                            </Button>
                                            {!hasFilters && (
                                                <MembersFilters
                                                    activeView={activeView}
                                                    filters={visibleFilters}
                                                    iconOnly={true}
                                                    nql={nql}
                                                    savedViews={savedViews}
                                                    onFiltersChange={setFilters}
                                                />
                                            )}
                                        </>
                                    )}
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
                                    />
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>

                        {shouldShowMemberControls && (shouldShowFiltersRow || shouldShowMobileSearchRow) && (
                            <FilterBar className={cn(filtersClassName, !shouldShowFiltersRow && 'lg:hidden')}>
                                {shouldShowMobileSearchRow && (
                                    <div className="w-full lg:hidden">
                                        <MembersHeaderSearch
                                            ariaLabel="Search members mobile"
                                            autoFocus={mobileSearchOpenedByUser}
                                            search={searchInput}
                                            onSearchChange={handleSearchChange}
                                        />
                                    </div>
                                )}
                                {shouldShowFiltersRow && (
                                    <MembersFilters
                                        activeView={activeView}
                                        filters={visibleFilters}
                                        nql={nql}
                                        savedViews={savedViews}
                                        onFiltersChange={setFilters}
                                    />
                                )}
                            </FilterBar>
                        )}
                        {hasStripeEnabled && multipleSubsFilterEnabled && (
                            <MultipleActiveSubscriptionsBanner
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
                            <h2 className="mb-2 text-xl font-medium">
                                Error loading members
                            </h2>
                            <p className="mb-4 text-muted-foreground">
                                Please reload the page to try again
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                Reload page
                            </Button>
                        </div>
                    ) : !data?.members.length ? (
                        hasFilterOrSearch ? (
                            <div className="flex flex-1 flex-col items-center justify-center">
                                <EmptyIndicator
                                    actions={
                                        <Button
                                            variant="outline"
                                            onClick={handleShowAllMembers}
                                        >
                                            Show all members
                                        </Button>
                                    }
                                    title="No matching members found."
                                >
                                    <LucideIcon.Users />
                                </EmptyIndicator>
                            </div>
                        ) : (
                            <MembersEmptyState membershipsEnabled={membershipsEnabled} onMemberCreated={async () => {
                                await refetch();
                            }} />
                        )
                    ) : (
                        <MembersList
                            activeColumns={activeColumns}
                            backPath={`${location.pathname}${location.search}`}
                            fetchNextPage={fetchNextPage}
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
        </MainLayout>
    );
};

const Members: React.FC = () => {
    const [searchParams] = useSearchParams();
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings({});
    const {data: configData, isLoading: isConfigLoading} = useBrowseConfig();
    const filterParam = searchParams.get('filter') ?? undefined;
    const hasResolvedSettings = Boolean(settingsData?.settings);
    const shouldDelayHydration = shouldDelayMembersDateFilterHydration(filterParam, hasResolvedSettings, isSettingsLoading);

    if (isSettingsLoading || isConfigLoading || !settingsData?.settings || !configData?.config || shouldDelayHydration) {
        return (
            <MainLayout>
                <ListPage>
                    <ListPage.Header className="py-4 sidebar:py-6">
                        <PageHeader
                            blurredBackground={false}
                            sticky={false}
                        >
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
            </MainLayout>
        );
    }

    const timezone = getSiteTimezone(settingsData.settings);
    const membersSignupAccess = getSettingValue<string>(settingsData.settings, 'members_signup_access');
    const membershipsEnabled = membersSignupAccess !== 'none';
    const emailAnalyticsEnabled = configData.config.emailAnalytics === true;
    const hasStripeEnabled = checkStripeEnabled(settingsData.settings, configData.config);
    const multipleSubsFilterEnabled = configData.config.labs?.multipleSubsFilter === true;

    return (
        <MembersPage
            emailAnalyticsEnabled={emailAnalyticsEnabled}
            hasStripeEnabled={hasStripeEnabled}
            membershipsEnabled={membershipsEnabled}
            multipleSubsFilterEnabled={multipleSubsFilterEnabled}
            timezone={timezone}
        />
    );
};

export default Members;
