import CommentsAnalytics from './components/comments-analytics';
import CommentsContent from './components/comments-content';
import CommentsFilters from './components/comments-filters';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import CommentsMain from './components/comments-main';
import CommentsSidebar from './components/comments-sidebar';
import React, {useCallback} from 'react';
import {Button, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {upsertCommentFilters, useFilterState} from './hooks/use-filter-state';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useOverviewRange} from './hooks/use-overview-range';
import type {CommentFilterUpdate} from './hooks/use-filter-state';

const Comments: React.FC = () => {
    const {filters, nql, setFilters, clearFilters, isSingleIdFilter} = useFilterState();
    const {data: configData} = useBrowseConfig();
    const analyticsEnabled = configData?.config?.labs?.commentAnalytics === true;

    const {range, setRange, dateFrom, dateTo, timezone} = useOverviewRange();

    const handleAddFilters = useCallback((updates: CommentFilterUpdate[]) => {
        setFilters((prevFilters) => {
            return upsertCommentFilters(prevFilters, updates);
        }, {replace: false});
    }, [setFilters]);

    const handleAddFilter = useCallback((field: string, value: string, operator: string = 'is') => {
        handleAddFilters([{field, value, operator}]);
    }, [handleAddFilters]);

    const {
        data,
        isError,
        isFetching,
        isFetchingNextPage,
        isRefetching,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments({
        searchParams: nql ? {filter: nql} : {},
        keepPreviousData: true
    });
    // If we are fetching comments, but not fetching the next page and not refetching, we should show the loading indicator
    const shouldShowLoading = isFetching && !isFetchingNextPage && !isRefetching;

    return (
        <CommentsLayout>
            <CommentsMain>
                <CommentsHeader>
                    {!isSingleIdFilter && (
                        <CommentsFilters
                            filters={filters}
                            onFiltersChange={setFilters}
                        />
                    )}
                </CommentsHeader>
                <CommentsContent>
                    {shouldShowLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError ? (
                        <div className="mb-16 flex h-full flex-col items-center justify-center">
                            <h2 className="mb-2 text-xl font-medium">
                                Error loading comments
                            </h2>
                            <p className="mb-4 text-muted-foreground">
                                Please reload the page to try again
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                Reload page
                            </Button>
                        </div>
                    ) : !data?.comments.length ? (
                        <div className="flex h-full items-center justify-center">
                            <EmptyIndicator
                                title="No comments yet"
                            >
                                <LucideIcon.MessageSquare />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <>
                            <CommentsList
                                fetchNextPage={fetchNextPage}
                                hasNextPage={hasNextPage}
                                isFetchingNextPage={isFetchingNextPage}
                                isLoading={isFetching && !isFetchingNextPage}
                                items={data?.comments ?? []}
                                resetKey={nql ?? ''}
                                totalItems={data?.meta?.pagination?.total ?? 0}
                                onAddFilter={handleAddFilter}
                            />
                            {isSingleIdFilter && (
                                <div className="flex justify-center py-8">
                                    <Button variant="outline" onClick={() => clearFilters({replace: false})}>
                                        Show all comments
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CommentsContent>
            </CommentsMain>
            {analyticsEnabled ? (
                <CommentsSidebar>
                    <CommentsAnalytics
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        range={range}
                        setRange={setRange}
                        timezone={timezone}
                        onAddFilters={handleAddFilters}
                    />
                </CommentsSidebar>
            ) : null}
        </CommentsLayout>
    );
};

export default Comments;
