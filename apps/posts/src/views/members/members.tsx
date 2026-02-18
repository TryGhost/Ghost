import MembersActions from './components/members-actions';
import MembersContent from './components/members-content';
import MembersFilters from './components/members-filters';
import MembersHeader from './components/members-header';
import MembersLayout from './components/members-layout';
import MembersList from './components/members-list';
import React, {useMemo} from 'react';
import {Button, EmptyIndicator, Header, LoadingIndicator, LucideIcon, cn} from '@tryghost/shade';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {useMembersFilterState} from './hooks/use-members-filter-state';

// Filters that restrict bulk delete
const BULK_DELETE_RESTRICTED_FILTERS = [
    'subscriptions.plan_interval',
    'subscriptions.status',
    'subscriptions.start_date',
    'subscriptions.current_period_end',
    'conversion',
    'offer_redemptions'
];

const Members: React.FC = () => {
    const {filters, nql, setFilters, isFiltered, clearFilters} = useMembersFilterState();
    const {data: configData} = useBrowseConfig();

    // Check if email analytics is enabled
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;

    // Check if bulk delete is permitted (not allowed if subscription filters are active)
    const canBulkDelete = useMemo(() => {
        return !filters.some(f => BULK_DELETE_RESTRICTED_FILTERS.includes(f.field));
    }, [filters]);

    // Build search params for the API query, merging with defaults so we don't lose include/limit/order
    const searchParams = useMemo((): Record<string, string> | undefined => {
        if (!nql) {
            return undefined;
        }
        return {
            include: 'labels,tiers',
            limit: '50',
            order: 'created_at desc',
            filter: nql
        };
    }, [nql]);

    const {
        data,
        isError,
        isFetching,
        isFetchingNextPage,
        isRefetching,
        fetchNextPage,
        hasNextPage
    } = useBrowseMembersInfinite({
        searchParams,
        keepPreviousData: true
    });

    // If we are fetching members, but not fetching the next page and not refetching, we should show the loading indicator
    const shouldShowLoading = isFetching && !isFetchingNextPage && !isRefetching;

    const totalMembers = data?.meta?.pagination?.total ?? 0;
    const hasFilters = filters.length > 0;

    // Position filters: inline with actions when no filters, full width row below when filters active
    const filtersClassName = cn(
        'flex flex-row',
        !hasFilters && 'items-center gap-2',
        hasFilters && 'col-start-1 col-end-4 row-start-3 pt-5'
    );

    return (
        <MembersLayout>
            <MembersHeader
                isLoading={shouldShowLoading}
                totalMembers={totalMembers}
            >
                {/* Actions - always inline in the actions area */}
                <Header.Actions>
                    <Header.ActionGroup>
                        {/* When no filters, show filter button inline with other actions */}
                        {!hasFilters && (
                            <MembersFilters
                                filters={filters}
                                onFiltersChange={setFilters}
                            />
                        )}
                        <MembersActions
                            canBulkDelete={canBulkDelete}
                            isFiltered={isFiltered}
                            memberCount={totalMembers}
                            nql={nql}
                        />
                    </Header.ActionGroup>
                </Header.Actions>

                {/* When filters are active, show them in a row below */}
                {hasFilters && (
                    <div className={filtersClassName}>
                        <MembersFilters
                            filters={filters}
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
                        {isFiltered ? (
                            <>
                                <EmptyIndicator title="No members match the current filter">
                                    <LucideIcon.Users />
                                </EmptyIndicator>
                                <Button
                                    className="mt-4"
                                    variant="outline"
                                    onClick={() => clearFilters({replace: false})}
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
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        isLoading={isFetching && !isFetchingNextPage}
                        items={data.members}
                        showEmailOpenRate={emailAnalyticsEnabled}
                        totalItems={totalMembers}
                    />
                )}
            </MembersContent>
        </MembersLayout>
    );
};

export default Members;
