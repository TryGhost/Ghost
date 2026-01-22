import CommentsContent from './components/comments-content';
import CommentsFilters from './components/comments-filters';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import React, {useCallback, useEffect} from 'react';
import {Button, EmptyIndicator, LoadingIndicator, LucideIcon, createFilter} from '@tryghost/shade';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useFilterState} from './hooks/use-filter-state';
import {useKnownFilterValues} from './hooks/use-known-filter-values';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

const Comments: React.FC = () => {
    const {filters, nql, setFilters, clearFilters, isSingleIdFilter} = useFilterState();
    const {data: configData} = useBrowseConfig();
    const commentPermalinksEnabled = configData?.config?.labs?.commentPermalinks === true;
    const location = useLocation();
    const navigate = useNavigate();

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

    useEffect(() => {
        const state = location.state as {filters?: Filter[]} | null;

        if (state?.filters && state.filters.length > 0 && !isSingleIdFilter && !isFetching) {
            setFilters(state.filters, {replace: true});
            
            navigate(location.pathname, {replace: true, state: {}});
        }
    }, [location.state, navigate, location.pathname, setFilters, isSingleIdFilter, isFetching]);

    const handleAddFilter = useCallback((field: string, value: string, operator: string = 'is') => {
        setFilters((prevFilters) => {
            const filtered = prevFilters.filter(f => f.field !== field);
            return [...filtered, createFilter(field, operator, [value])];
        }, {replace: false});
    }, [setFilters]);

    const {knownPosts, knownMembers, knownThreads, knownReplyTos} = useKnownFilterValues({comments: data?.comments ?? []});

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
                        knownReplyTos={knownReplyTos}
                        knownThreads={knownThreads}
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
                            disableMemberCommentingEnabled={disableMemberCommentingEnabled}
                            fetchNextPage={fetchNextPage}
                            filters={filters}
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
