import CommentsAnalyticsPanel from './analytics/comments-analytics-panel';
import CommentsAnalyticsRail from './analytics/comments-analytics-rail';
import CommentsDateRangeSelect from './analytics/comments-date-range-select';
import CommentsFilters from './components/comments-filters';
import CommentsList from './components/comments-list';
import { Box, Container, Inline, Stack, Text } from '@tryghost/shade/primitives';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  EmptyIndicator,
  LoadingIndicator,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@tryghost/shade/components';
import { FilterBar, PageHeader, createFilter } from '@tryghost/shade/patterns';
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
import { STATS_RANGES } from '@/shared/analytics/constants';

function getSingleCommentIdParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get('id');
  const match = value?.match(/^is:(.+)$/);

  return match?.[1];
}

const CommentsPage: React.FC<{
  timezone: string;
  // Shared date scopes wait for the site timezone; the plain list can use UTC.
  timezoneReady: boolean;
  singleCommentId?: string;
}> = ({ timezone, timezoneReady, singleCommentId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, nql, setFilters } = useFilterState(timezone);
  const dislikesEnabled = true;
  const analyticsEnabled = useFeatureFlag('commentsAnalytics') && !singleCommentId;
  const isSelected = (field: string) =>
    filters.some(
      (filter) =>
        filter.field === field &&
        filter.operator === 'is' &&
        filter.values.length === 1 &&
        Boolean(filter.values[0]),
    );
  const postFiltered = analyticsEnabled && isSelected('post');
  const commenterFiltered = analyticsEnabled && isSelected('author');
  const wideLayout = useWideLayout();
  const [analyticsSheetOpen, setAnalyticsSheetOpen] = useState(false);
  // Narrow screens fetch nothing until the sheet first opens
  const [analyticsSheetOpened, setAnalyticsSheetOpened] = useState(false);
  const analytics = useCommentsAnalytics(
    timezone,
    analyticsEnabled && timezoneReady && (wideLayout || analyticsSheetOpened),
    nql,
    { postFiltered, commenterFiltered },
  );
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
  // Ranking rows progressively narrow the shared scope, keeping the other fields.
  const handleAnalyticsFilter = useCallback(
    (field: 'post' | 'author', id: string) => {
      setFilters(
        [...filters.filter((filter) => filter.field !== field), createFilter(field, 'is', [id])],
        { replace: false },
      );
    },
    [filters, setFilters],
  );
  const effectiveFilter = useMemo(() => {
    if (singleCommentId) {
      return `id:${escapeNqlString(singleCommentId)}`;
    }

    return analyticsEnabled ? analytics.listFilter : nql;
  }, [analytics.listFilter, analyticsEnabled, nql, singleCommentId]);

  const handleShowAllComments = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const {
    data,
    isError,
    isFetching,
    isFetchingNextPage,
    isRefetching,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
  } = useBrowseComments({
    enabled: !analyticsEnabled || timezoneReady,
    searchParams: {
      include: adminCommentIncludes(dislikesEnabled),
      ...(effectiveFilter ? { filter: effectiveFilter } : {}),
    },
    placeholderData: keepPreviousData,
  });

  const noComments =
    data !== undefined &&
    !isPlaceholderData &&
    !isFetching &&
    !isError &&
    data.comments.length === 0;
  const showAnalytics = analyticsEnabled && !analytics.unavailable && !noComments;
  if (noComments && analyticsSheetOpen) {
    setAnalyticsSheetOpen(false);
  }

  const shouldShowLoading =
    (analyticsEnabled && !timezoneReady) || (isFetching && !isFetchingNextPage && !isRefetching);
  const resetKey = effectiveFilter ?? '';
  const hasFilters = filters.length > 0;
  const hasSharedFilters =
    analyticsEnabled && (hasFilters || analytics.range !== STATS_RANGES.allTime.value);

  const commentsBody = shouldShowLoading ? (
    <Inline className="flex-1" justify="center">
      <LoadingIndicator size="lg" />
    </Inline>
  ) : isError ? (
    <Stack align="center" className="flex-1" gap="none" justify="center">
      <Text as="h2" className="mb-2" size="xl" weight="medium">
        Error loading comments
      </Text>
      <Text as="p" className="mb-4" tone="secondary">
        Please reload the page to try again
      </Text>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
    </Stack>
  ) : !data?.comments.length ? (
    <Stack align="center" className="flex-1" gap="none" justify="center">
      <EmptyIndicator
        title={
          singleCommentId
            ? 'Comment not found'
            : hasSharedFilters
              ? 'No comments match these filters'
              : 'No comments yet'
        }
      >
        <LucideIcon.MessageSquare />
      </EmptyIndicator>
      {(singleCommentId || hasSharedFilters) && (
        <Button className="mt-4" variant="outline" onClick={handleShowAllComments}>
          {singleCommentId ? 'Show all comments' : 'Reset filters'}
        </Button>
      )}
    </Stack>
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
        <Inline className="py-8" justify="center">
          <Button variant="outline" onClick={handleShowAllComments}>
            Show all comments
          </Button>
        </Inline>
      )}
    </>
  );

  return (
    <Container className="relative h-full min-w-0" size="page">
      <ListPage data-testid="comments-page">
        <ListPage.Header>
          <PageHeader
            blurredBackground={false}
            className={analyticsEnabled ? '[&_[data-page-header=main]]:flex-wrap' : undefined}
            sticky={false}
          >
            <PageHeader.Left>
              <PageHeader.Title>Comments</PageHeader.Title>
            </PageHeader.Left>
            {((!singleCommentId && !hasFilters) || analyticsEnabled) && (
              <PageHeader.Actions>
                <PageHeader.ActionGroup>
                  {showAnalytics && !wideLayout && (
                    <PageHeader.Action
                      className="px-2 sm:px-3"
                      label="Analytics"
                      onClick={() => {
                        setAnalyticsSheetOpen(true);
                        setAnalyticsSheetOpened(true);
                      }}
                    >
                      <LucideIcon.ChartNoAxesColumn />
                      <span className="hidden sm:inline">Analytics</span>
                    </PageHeader.Action>
                  )}
                  {!singleCommentId && !hasFilters && (
                    <CommentsFilters
                      filters={filters}
                      includeDateFilter={!analyticsEnabled}
                      siteTimezone={timezone}
                      onFiltersChange={setFilters}
                    />
                  )}
                  {analyticsEnabled && (
                    <CommentsDateRangeSelect
                      customRange={analytics.customRange}
                      range={analytics.range}
                      timezone={timezone}
                      onCustomRangeChange={analytics.setCustomRange}
                      onRangeChange={analytics.setRange}
                    />
                  )}
                </PageHeader.ActionGroup>
              </PageHeader.Actions>
            )}
          </PageHeader>
          {!singleCommentId && hasFilters && (
            <FilterBar>
              <CommentsFilters
                filters={filters}
                includeDateFilter={!analyticsEnabled}
                siteTimezone={timezone}
                onFiltersChange={setFilters}
              />
            </FilterBar>
          )}
        </ListPage.Header>
        <ListPage.Body>
          {analyticsEnabled && wideLayout ? (
            <Inline align="stretch" className="min-h-0 flex-1" gap="xl">
              <Stack className="min-w-0 flex-1" gap="none">
                {commentsBody}
              </Stack>
              {showAnalytics && (
                <CommentsAnalyticsRail>
                  <CommentsAnalyticsPanel analytics={analytics} onFilter={handleAnalyticsFilter} />
                </CommentsAnalyticsRail>
              )}
            </Inline>
          ) : (
            commentsBody
          )}
        </ListPage.Body>
      </ListPage>
      {showAnalytics && !wideLayout && (
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
      )}
    </Container>
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
