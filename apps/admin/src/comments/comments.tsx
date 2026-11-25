import CommentsAnalyticsPanel from './analytics/comments-analytics-panel';
import CommentsAnalyticsRail from './analytics/comments-analytics-rail';
import CommentsFilters from './components/comments-filters';
import CommentsList from './components/comments-list';
import { Box, Container, Inline } from '@tryghost/shade/primitives';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  EmptyIndicator,
  LoadingIndicator,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@tryghost/shade/components';
import { FilterBar, PageHeader, createFilter, useMobileFilters } from '@tryghost/shade/patterns';
import { ListPage } from '@tryghost/shade/page-templates';
import { LucideIcon } from '@tryghost/shade/utils';
import { adminCommentIncludes, useBrowseComments } from '@tryghost/admin-x-framework/api/comments';
import { keepPreviousData } from '@tanstack/react-query';
import { escapeNqlString } from '@tryghost/nql-string';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { serializeCommentFilters } from './comment-filter-query';
import { shouldDelayCommentDateFilterHydration, useFilterState } from './hooks/use-filter-state';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useCommentsAnalytics } from './analytics/use-comments-analytics';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useSearchParams } from '@tryghost/admin-x-framework';
import { useWideLayout } from './analytics/use-wide-layout';

function getSingleCommentIdParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get('id');
  const match = value?.match(/^is:(.+)$/);

  return match?.[1];
}

const CommentsPage: React.FC<{
  timezone: string;
  // The list can render on the UTC fallback; analytics would fetch every query twice
  timezoneReady: boolean;
  singleCommentId?: string;
}> = ({ timezone, timezoneReady, singleCommentId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, nql, setFilters } = useFilterState(timezone);
  const dislikesEnabled = true;
  const analyticsEnabled = useFeatureFlag('commentsAnalytics') && !singleCommentId;
  const wideLayout = useWideLayout();
  const [analyticsSheetOpen, setAnalyticsSheetOpen] = useState(false);
  // Narrow screens fetch nothing until the sheet first opens
  const [analyticsSheetOpened, setAnalyticsSheetOpened] = useState(false);
  const analytics = useCommentsAnalytics(
    timezone,
    analyticsEnabled && timezoneReady && (wideLayout || analyticsSheetOpened),
  );
  const showAnalytics = analyticsEnabled && !analytics.unavailable;
  const handleAddFilter = useCallback(
    (field: string, value: string, operator: string = 'is') => {
      const nextFilters = [
        ...filters.filter((filter) => filter.field !== field),
        createFilter(field, operator, [value]),
      ];

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
    [filters, searchParams, setFilters, setSearchParams, singleCommentId, timezone],
  );
  // Panel rows show the list for one post or member, so they replace either filter
  const handleAnalyticsFilter = useCallback(
    (field: 'post' | 'author', id: string) => {
      setFilters(
        [
          ...filters.filter((filter) => filter.field !== 'post' && filter.field !== 'author'),
          createFilter(field, 'is', [id]),
        ],
        { replace: false },
      );
    },
    [filters, setFilters],
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
  const mobileFilters = useMobileFilters();
  const [filterBarContainer, setFilterBarContainer] = useState<HTMLDivElement | null>(null);

  return (
    <Inline align="stretch" className="size-full" gap="none">
      <Box className="min-w-0 flex-1">
        <Container className="relative flex h-full flex-col" size="page">
          <ListPage data-testid="comments-page">
            <ListPage.Header>
              <PageHeader blurredBackground={false} sticky={false}>
                <PageHeader.Left>
                  <PageHeader.Title>Comments</PageHeader.Title>
                </PageHeader.Left>
                {((!singleCommentId && (!hasFilters || mobileFilters)) || showAnalytics) && (
                  <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                      {showAnalytics && !wideLayout && (
                        <PageHeader.Action
                          label="Analytics"
                          onClick={() => {
                            setAnalyticsSheetOpen(true);
                            setAnalyticsSheetOpened(true);
                          }}
                        >
                          <LucideIcon.ChartNoAxesColumn />
                          Analytics
                        </PageHeader.Action>
                      )}
                      {!singleCommentId && (!hasFilters || mobileFilters) && (
                        <CommentsFilters
                          barContainer={filterBarContainer}
                          filters={filters}
                          siteTimezone={timezone}
                          onFiltersChange={setFilters}
                        />
                      )}
                    </PageHeader.ActionGroup>
                  </PageHeader.Actions>
                )}
              </PageHeader>
              {!singleCommentId && hasFilters && mobileFilters && (
                <div ref={setFilterBarContainer} />
              )}
              {!singleCommentId && hasFilters && !mobileFilters && (
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
        </Container>
      </Box>
      {showAnalytics &&
        (wideLayout ? (
          <CommentsAnalyticsRail>
            <CommentsAnalyticsPanel analytics={analytics} onFilter={handleAnalyticsFilter} />
          </CommentsAnalyticsRail>
        ) : (
          <Sheet open={analyticsSheetOpen} onOpenChange={setAnalyticsSheetOpen}>
            <SheetContent aria-describedby={undefined} className="overflow-y-auto sm:max-w-[400px]">
              <SheetTitle className="sr-only">Comment analytics</SheetTitle>
              <CommentsAnalyticsPanel
                analytics={analytics}
                onFilter={(field, id) => {
                  setAnalyticsSheetOpen(false);
                  handleAnalyticsFilter(field, id);
                }}
              />
            </SheetContent>
          </Sheet>
        ))}
    </Inline>
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

  return (
    <CommentsPage
      singleCommentId={singleCommentId}
      timezone={timezone}
      timezoneReady={!isSettingsLoading}
    />
  );
};

export default Comments;
