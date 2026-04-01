import MembersActions from './components/members-actions';
import MembersContent from './components/members-content';
import MembersFilters from './components/members-filters';
import MembersHeader from './components/members-header';
import MembersHeaderSearch from './components/members-header-search';
import MembersLayout from './components/members-layout';
import MembersList from './components/members-list';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Button, EmptyIndicator, ListHeader, LoadingIndicator, LucideIcon, cn} from '@tryghost/shade';
import {buildMemberListSearchParams, getMemberActiveColumns} from './member-query-params';
import {canBulkDeleteMembers, shouldShowMembersLoading} from './members-view-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {shouldDelayMembersDateFilterHydration, useMembersFilterState} from './hooks/use-members-filter-state';
import {useActiveMemberView, useMemberViews} from './hooks/use-member-views';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useDebounce} from 'use-debounce';
import {useSearchParams} from 'react-router';

const SEARCH_DEBOUNCE_MS = 250;

const MembersPage: React.FC<{timezone: string}> = ({timezone}) => {
    const headerRef = useRef<HTMLDivElement>(null);
    const {filters, nql, search, setFilters, setSearch, hasFilterOrSearch, clearAll} = useMembersFilterState(timezone);
    const {data: configData} = useBrowseConfig();
    const savedViews = useMemberViews();
    const activeView = useActiveMemberView(savedViews, nql);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileSearchOpenedByUser, setMobileSearchOpenedByUser] = useState(false);
    const [searchInput, setSearchInput] = useState(search);
    const [debouncedSearch] = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;

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
    const hasFilters = filters.length > 0;
    const shouldShowMobileSearchRow = showMobileSearch;
    const shouldShowFiltersRow = hasFilters;

    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    useEffect(() => {
        if (debouncedSearch !== search) {
            setSearch(debouncedSearch);
        }
    }, [debouncedSearch, search, setSearch]);

    const handleMobileSearchToggle = () => {
        if (showMobileSearch) {
            setShowMobileSearch(false);
            setMobileSearchOpenedByUser(false);
            return;
        }

        setMobileSearchOpenedByUser(true);
        setShowMobileSearch(true);
    };

    const filtersClassName = 'flex flex-col gap-4 px-4 lg:flex-row lg:items-center sidebar:gap-6 lg:px-8 lg:gap-6';

    return (
        <MembersLayout>
            <div ref={headerRef} className='sticky top-0 z-50 flex flex-col gap-4 bg-gradient-to-b from-background via-background/70 to-background/70 py-4 backdrop-blur-md sidebar:gap-6 sidebar:py-6 dark:bg-black'>
                <MembersHeader
                    isLoading={shouldShowLoading}
                    totalMembers={totalMembers}
                >
                    <ListHeader.Actions>
                        <ListHeader.ActionGroup className="ml-auto flex-wrap justify-end sm:ml-0 sm:flex-nowrap">
                            <div className="hidden lg:flex">
                                <MembersHeaderSearch
                                    search={searchInput}
                                    onSearchChange={setSearchInput}
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
                                    filters={filters}
                                    iconOnly={true}
                                    nql={nql}
                                    savedViews={savedViews}
                                    onFiltersChange={setFilters}
                                />
                            )}
                            <MembersActions
                                canBulkDelete={canBulkDelete}
                                hasFilterOrSearch={hasFilterOrSearch}
                                memberCount={totalMembers}
                                nql={nql}
                                search={search}
                                onImportComplete={() => {
                                    void refetch();
                                }}
                            />
                        </ListHeader.ActionGroup>
                    </ListHeader.Actions>
                </MembersHeader>

                {(shouldShowFiltersRow || shouldShowMobileSearchRow) && (
                    <div className={cn(filtersClassName, !shouldShowFiltersRow && 'lg:hidden')}>
                        {shouldShowMobileSearchRow && (
                            <div className="lg:hidden">
                                <MembersHeaderSearch
                                    ariaLabel="Search members mobile"
                                    autoFocus={mobileSearchOpenedByUser}
                                    search={searchInput}
                                    onSearchChange={setSearchInput}
                                />
                            </div>
                        )}
                        {shouldShowFiltersRow && (
                            <MembersFilters
                                activeView={activeView}
                                filters={filters}
                                nql={nql}
                                savedViews={savedViews}
                                onFiltersChange={setFilters}
                            />
                        )}
                    </div>
                )}
            </div>
            <MembersContent>
                {shouldShowLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
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
                    <div className="flex h-full flex-col items-center justify-center">
                        {hasFilterOrSearch ? (
                            <>
                                <EmptyIndicator title="No matching members found.">
                                    <LucideIcon.Users />
                                </EmptyIndicator>
                                <Button
                                    className="mt-4"
                                    variant="outline"
                                    onClick={() => clearAll({replace: false})}
                                >
                                    Show all members
                                </Button>
                            </>
                        ) : (
                            <EmptyIndicator title="No members yet">
                                <LucideIcon.Users />
                            </EmptyIndicator>
                        )}
                    </div>
                ) : (
                    <MembersList
                        activeColumns={activeColumns}
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
            </MembersContent>
        </MembersLayout>
    );
};

const Members: React.FC = () => {
    const [searchParams] = useSearchParams();
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings({});
    const filterParam = searchParams.get('filter') ?? undefined;
    const shouldDelayHydration = shouldDelayMembersDateFilterHydration(filterParam, Boolean(settingsData), isSettingsLoading);

    if (shouldDelayHydration) {
        return (
            <MembersLayout>
                <div className='sticky top-0 z-50 bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black'>
                    <MembersHeader
                        isLoading={true}
                        totalMembers={0}
                    />
                </div>
                <MembersContent>
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                </MembersContent>
            </MembersLayout>
        );
    }

    const timezone = getSiteTimezone(settingsData?.settings ?? []);

    return <MembersPage timezone={timezone} />;
};

export default Members;
