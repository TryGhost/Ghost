import MembersActions from './components/members-actions';
import MembersContent from './components/members-content';
import MembersFilters from './components/members-filters';
import MembersHeader from './components/members-header';
import MembersHeaderSearch from './components/members-header-search';
import MembersLayout from './components/members-layout';
import MembersList from './components/members-list';
import React, {useMemo} from 'react';
import {Button, EmptyIndicator, Header, LoadingIndicator, LucideIcon, cn} from '@tryghost/shade';
import {buildMemberListSearchParams, getMemberActiveColumns} from './member-query-params';
import {canBulkDeleteMembers, shouldShowMembersLoading} from './members-view-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {shouldDelayMembersDateFilterHydration, useMembersFilterState} from './hooks/use-members-filter-state';
import {useActiveMemberView, useMemberViews} from './hooks/use-member-views';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useSearchParams} from 'react-router';

const MembersPage: React.FC<{timezone: string}> = ({timezone}) => {
    const {filters, nql, search, setFilters, setSearch, hasFilterOrSearch, clearAll} = useMembersFilterState(timezone);
    const {data: configData} = useBrowseConfig();
    const savedViews = useMemberViews();
    const activeView = useActiveMemberView(savedViews, nql);

    // Check if email analytics is enabled
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;

    // Extract active columns from filters (max 2)
    const activeColumns = useMemo(() => {
        return getMemberActiveColumns(filters);
    }, [filters]);

    // Check if bulk delete is permitted (not allowed if subscription filters are active)
    const canBulkDelete = useMemo(() => {
        return canBulkDeleteMembers(filters, nql);
    }, [filters, nql]);

    // Build search params for the API query, merging with defaults so we don't lose include/limit/order
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

    // Position filters: inline with actions when no filters, full width row below when filters active
    const filtersClassName = cn(
        'flex flex-row',
        !hasFilters && 'items-center gap-2',
        hasFilters && 'col-span-full row-start-4 pt-5'
    );

    return (
        <MembersLayout>
            <MembersHeader
                isLoading={shouldShowLoading}
                totalMembers={totalMembers}
            >
                {/* Actions - always inline in the actions area */}
                <Header.Actions>
                    <Header.ActionGroup className="ml-auto flex-wrap justify-end sm:ml-0 sm:flex-nowrap">
                        <MembersHeaderSearch
                            search={search}
                            onSearchChange={setSearch}
                        />
                        {/* When no filters, show filter button inline with other actions */}
                        {!hasFilters && (
                            <MembersFilters
                                activeView={activeView}
                                filters={filters}
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
                    </Header.ActionGroup>
                </Header.Actions>

                {/* When filters are active, show them in a row below */}
                {hasFilters && (
                    <div className={filtersClassName}>
                        <MembersFilters
                            activeView={activeView}
                            filters={filters}
                            nql={nql}
                            savedViews={savedViews}
                            onFiltersChange={setFilters}
                        />
                    </div>
                )}
            </MembersHeader>
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
                <MembersHeader
                    isLoading={true}
                    totalMembers={0}
                />
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
