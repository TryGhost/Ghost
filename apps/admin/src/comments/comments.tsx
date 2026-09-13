import CommentsAnalytics from './components/comments-analytics';
import CommentsFilters from './components/comments-filters';
import CommentsList from './components/comments-list';
import { Box, Container } from '@tryghost/shade/primitives';
import React, { useCallback, useMemo } from 'react';
import { Button, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { FilterBar, PageHeader } from '@tryghost/shade/patterns';
import { ListPage } from '@tryghost/shade/page-templates';
import { LucideIcon } from '@tryghost/shade/utils';
import { adminCommentIncludes, useBrowseComments } from '@tryghost/admin-x-framework/api/comments';
import { keepPreviousData } from '@tanstack/react-query';
import { escapeNqlString } from '@tryghost/nql-string';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { applyCommentFilters, type CommentFilterPatch } from './apply-comment-filters';
import { serializeCommentFilters } from './comment-filter-query';
import { shouldDelayCommentDateFilterHydration, useFilterState } from './hooks/use-filter-state';
import { useOverviewRange } from './hooks/use-overview-range';
import {
  useCommentsOverviewRail,
  useCommentsOverviewSearchParams,
} from './hooks/use-comments-overview-rail';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useSearchParams } from '@tryghost/admin-x-framework';

function getSingleCommentIdParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get('id');
  const match = value?.match(/^is:(.+)$/);

  return match?.[1];
}

const CommentsPage: React.FC<{ timezone: string; singleCommentId?: string }> = ({
  timezone,
  singleCommentId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, nql, setFilters } = useFilterState(timezone);
  const { range, setRange, dateFrom, dateTo } = useOverviewRange(timezone);
  const overviewSearchParams = useCommentsOverviewSearchParams(dateFrom, dateTo, timezone);
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isError: overviewError,
    showRail,
  } = useCommentsOverviewRail(overviewSearchParams);
  const dislikesEnabled = true;

  const commitFilters = useCallback(
    (nextFilters: ReturnType<typeof applyCommentFilters>) => {
      if (!singleCommentId) {
        setFilters(nextFilters, { replace: false });
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams);
      const nextNql = serializeCommentFilters(nextFilters, timezone);

      nextSearchParams.delete('id');
      nextSearchParams.delete('filter');

      if (nextNql) {
        nextSearchParams.set('filter', nextNql);
      }

      setSearchParams(nextSearchParams, { replace: false });
    },
    [searchParams, setFilters, setSearchParams, singleCommentId, timezone],
  );

  const handleApplyFilters = useCallback(
    (patches: CommentFilterPatch[]) => {
      commitFilters(applyCommentFilters(filters, patches));
    },
    [commitFilters, filters],
  );

  const handleAddFilter = useCallback(
    (field: string, value: string, operator: string = 'is') => {
      handleApplyFilters([{ field, value, operator }]);
    },
    [handleApplyFilters],
  );

  const effectiveFilter = useMemo(() => {
    if (singleCommentId) {
      return `id:${escapeNqlString(singleCommentId)}`;
    }

    return nql;
  }, [nql, singleCommentId]);

  const handleShowAllComments = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const {
    data,
    isError,
    isFetching,
    isFetchingNextPage,
    isRefetching,
    fetchNextPage,
    hasNextPage,
  } = useBrowseComments({
    searchParams: {
      include: adminCommentIncludes(dislikesEnabled),
      ...(effectiveFilter ? { filter: effectiveFilter } : {}),
    },
    placeholderData: keepPreviousData,
  });

  const shouldShowLoading = isFetching && !isFetchingNextPage && !isRefetching;
  const resetKey = effectiveFilter ?? '';
  const hasFilters = filters.length > 0;

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <div
          className={
            showRail
              ? 'block grow lg:grid lg:grid-cols-[minmax(0,1fr)_460px]'
              : 'flex h-full flex-col'
          }
        >
          {showRail && (
            <aside className="px-4 pt-4 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:max-h-screen lg:self-start lg:overflow-y-auto lg:border-l lg:border-border lg:px-8 lg:pt-8">
              <CommentsAnalytics
                data={overviewData}
                dateFrom={dateFrom}
                dateTo={dateTo}
                isError={overviewError}
                isLoading={overviewLoading}
                range={range}
                setRange={setRange}
                onApplyFilters={handleApplyFilters}
              />
            </aside>
          )}
          <ListPage className="lg:col-start-1 lg:row-start-1" data-testid="comments-page">
            <ListPage.Header>
              <PageHeader blurredBackground={false} sticky={false}>
                <PageHeader.Left>
                  <PageHeader.Title>Comments</PageHeader.Title>
                </PageHeader.Left>
                {!singleCommentId && !hasFilters && (
                  <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                      <CommentsFilters
                        filters={filters}
                        siteTimezone={timezone}
                        onFiltersChange={setFilters}
                      />
                    </PageHeader.ActionGroup>
                  </PageHeader.Actions>
                )}
              </PageHeader>
              {!singleCommentId && hasFilters && (
                <FilterBar>
                  <CommentsFilters
                    filters={filters}
                    siteTimezone={timezone}
                    onFiltersChange={setFilters}
                  />
                </FilterBar>
              )}
            </ListPage.Header>
            <ListPage.Body>
              {shouldShowLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <LoadingIndicator size="lg" />
                </div>
              ) : isError ? (
                <div className="flex flex-1 flex-col items-center justify-center">
                  <h2 className="mb-2 text-xl font-medium">Error loading comments</h2>
                  <p className="mb-4 text-muted-foreground">Please reload the page to try again</p>
                  <Button onClick={() => window.location.reload()}>Reload page</Button>
                </div>
              ) : !data?.comments.length ? (
                <div className="flex flex-1 items-center justify-center">
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
                    <EmptyIndicator title="No comments yet">
                      <LucideIcon.MessageSquare />
                    </EmptyIndicator>
                  )}
                </div>
              ) : (
                <>
                  <CommentsList
                    dislikesEnabled={dislikesEnabled}
                    fetchNextPage={() => void fetchNextPage()}
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
            </ListPage.Body>
          </ListPage>
        </div>
      </Container>
    </Box>
  );
};

const Comments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { data: settingsData, isLoading: isSettingsLoading } = useBrowseSettings({});
  const singleCommentId = useMemo(() => getSingleCommentIdParam(searchParams), [searchParams]);
  const filterParam = searchParams.get('filter') ?? undefined;
  const shouldDelayHydration =
    !singleCommentId &&
    shouldDelayCommentDateFilterHydration(filterParam, Boolean(settingsData), isSettingsLoading);

  if (shouldDelayHydration) {
    return (
      <Box className="size-full">
        <Container className="relative flex h-full flex-col" size="page">
          <ListPage>
            <ListPage.Header>
              <PageHeader blurredBackground={false} sticky={false}>
                <PageHeader.Left>
                  <PageHeader.Title>Comments</PageHeader.Title>
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

  const timezone = getSiteTimezone(settingsData?.settings ?? []);

  return <CommentsPage singleCommentId={singleCommentId} timezone={timezone} />;
};

export default Comments;
