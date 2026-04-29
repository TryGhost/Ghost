import CommentsContent from './components/comments-content';
import CommentsFilters from './components/comments-filters';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import React, {useCallback, useMemo} from 'react';
import {Button, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {createFilter} from '@tryghost/shade/patterns';
import {escapeNqlString} from '../filters/filter-normalization';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {serializeCommentFilters} from './comment-filter-query';
import {shouldDelayCommentDateFilterHydration, useFilterState} from './hooks/use-filter-state';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useSearchParams} from 'react-router';

function getSingleCommentIdParam(searchParams: URLSearchParams): string | undefined {
    const value = searchParams.get('id');
    const match = value?.match(/^is:(.+)$/);

    return match?.[1];
}

const CommentsPage: React.FC<{timezone: string; singleCommentId?: string}> = ({
    timezone,
    singleCommentId
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const {filters, nql, setFilters} = useFilterState(timezone);
    const handleAddFilter = useCallback((field: string, value: string, operator: string = 'is') => {
        const nextFilters = [
            ...filters.filter(filter => filter.field !== field),
            createFilter(field, operator, [value])
        ];

        if (!singleCommentId) {
            setFilters(nextFilters, {replace: false});
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        const nextNql = serializeCommentFilters(nextFilters, timezone);

        nextSearchParams.delete('id');
        nextSearchParams.delete('filter');

        if (nextNql) {
            nextSearchParams.set('filter', nextNql);
        }

        setSearchParams(nextSearchParams, {replace: false});
    }, [filters, searchParams, setFilters, setSearchParams, singleCommentId, timezone]);
    const effectiveFilter = useMemo(() => {
        if (singleCommentId) {
            return `id:${escapeNqlString(singleCommentId)}`;
        }

        return nql;
    }, [nql, singleCommentId]);

    const handleShowAllComments = useCallback(() => {
        setSearchParams(new URLSearchParams(), {replace: false});
    }, [setSearchParams]);

    const {
        data,
        isError,
        isFetching,
        isFetchingNextPage,
        isRefetching,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments({
        searchParams: {
            ...(effectiveFilter ? {filter: effectiveFilter} : {})
        },
        keepPreviousData: true
    });
    const shouldShowLoading = isFetching && !isFetchingNextPage && !isRefetching;
    const resetKey = effectiveFilter ?? '';

    return (
        <CommentsLayout>
            <CommentsHeader>
                {!singleCommentId && (
                    <CommentsFilters
                        filters={filters}
                        siteTimezone={timezone}
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
                        {singleCommentId ? (
                            <div className="flex flex-col items-center">
                                <EmptyIndicator title="Comment not found">
                                    <LucideIcon.MessageSquare />
                                </EmptyIndicator>
                                <Button className="mt-4" variant="outline" onClick={handleShowAllComments}>
                                    Show all comments
                                </Button>
                            </div>
                        ) : (
                            <EmptyIndicator
                                title="No comments yet"
                            >
                                <LucideIcon.MessageSquare />
                            </EmptyIndicator>
                        )}
                    </div>
                ) : (
                    <>
                        <CommentsList
                            fetchNextPage={fetchNextPage}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            isLoading={isFetching && !isFetchingNextPage}
                            items={data?.comments ?? []}
                            resetKey={resetKey}
                            totalItems={data?.meta?.pagination?.total ?? 0}
                            onAddFilter={handleAddFilter}
                        />
                        {singleCommentId && (
                            <div className="flex justify-center py-8">
                                <Button variant="outline" onClick={handleShowAllComments}>
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

const Comments: React.FC = () => {
    const [searchParams] = useSearchParams();
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings({});
    const singleCommentId = useMemo(() => getSingleCommentIdParam(searchParams), [searchParams]);
    const filterParam = searchParams.get('filter') ?? undefined;
    const shouldDelayHydration = !singleCommentId && shouldDelayCommentDateFilterHydration(filterParam, Boolean(settingsData), isSettingsLoading);

    if (shouldDelayHydration) {
        return (
            <CommentsLayout>
                <CommentsHeader />
                <CommentsContent>
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                </CommentsContent>
            </CommentsLayout>
        );
    }

    const timezone = getSiteTimezone(settingsData?.settings ?? []);

    return <CommentsPage singleCommentId={singleCommentId} timezone={timezone} />;
};

export default Comments;
