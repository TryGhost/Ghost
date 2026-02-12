import CommentsContent from './components/comments-content';
import CommentsFilters from './components/comments-filters';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import React, {useCallback, useMemo} from 'react';
import {Button, EmptyIndicator, LoadingIndicator, LucideIcon, createFilter} from '@tryghost/shade';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useFilterState} from './hooks/use-filter-state';
import {useKnownFilterValues} from './hooks/use-known-filter-values';

const Comments: React.FC = () => {
    const {filters, nql, setFilters, clearFilters, isSingleIdFilter} = useFilterState();
    const {data: configData} = useBrowseConfig();
    const commentPermalinksEnabled = configData?.config?.labs?.commentPermalinks === true;

    // Extract anchor comment ID when navigating to a specific comment
    const anchorCommentId = useMemo(() => {
        if (isSingleIdFilter && filters[0]?.values[0]) {
            return String(filters[0].values[0]);
        }
        return undefined;
    }, [isSingleIdFilter, filters]);

    const handleAddFilter = useCallback((field: string, value: string, operator: string = 'is') => {
        setFilters((prevFilters) => {
            // Remove any existing filter for the same field
            const filtered = prevFilters.filter(f => f.field !== field);
            // Add the new filter
            return [...filtered, createFilter(field, operator, [value])];
        }, {replace: false});
    }, [setFilters]);

    // Build search params: use anchor for deep links, filter for normal browsing
    const searchParams = useMemo((): Record<string, string> => {
        if (anchorCommentId) {
            return {anchor: anchorCommentId};
        }
        if (nql) {
            return {filter: nql};
        }
        return {};
    }, [anchorCommentId, nql]);

    const {
        data,
        isError,
        isFetching,
        isFetchingNextPage,
        isRefetching,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments({
        searchParams,
        keepPreviousData: true
    });

    const {knownPosts, knownMembers} = useKnownFilterValues({comments: data?.comments ?? []});

    // If we are fetching comments, but not fetching the next page and not refetching, we should show the loading indicator
    const shouldShowLoading = isFetching && !isFetchingNextPage && !isRefetching;

    return (
        <CommentsLayout>
            <CommentsHeader>
                {!isSingleIdFilter && (
                    <CommentsFilters
                        filters={filters}
                        knownMembers={knownMembers}
                        knownPosts={knownPosts}
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
                            commentPermalinksEnabled={commentPermalinksEnabled}
                            fetchNextPage={fetchNextPage}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            isLoading={isFetching && !isFetchingNextPage}
                            items={data?.comments ?? []}
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
        </CommentsLayout>
    );
};

export default Comments;
