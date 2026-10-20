import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Button,
  DataList,
  DataListBar,
  DataListBody,
  DataListItemContent,
  DataListItemValue,
  DataListItemValueAbs,
  DataListItemValuePerc,
  DataListRow,
  EmptyIndicator,
  LoadingIndicator,
  SimplePagination,
  SimplePaginationNavigation,
  SimplePaginationNextButton,
  SimplePaginationPreviousButton,
  TooltipProvider,
} from '@tryghost/shade/components';
import { Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  LucideIcon,
  cn,
  formatNumber,
  formatPercentage,
  useSimplePagination,
} from '@tryghost/shade/utils';
import {
  type AutomationActionLink,
  type AutomationEmailStats,
  useBrowseAutomationActionLinks,
} from '@tryghost/admin-x-framework/api/automations';
import { useEmailTrackingSettings } from '@/automations/hooks/use-email-tracking-settings';
import { POST_METRIC_ICONS } from '@/posts/api';
import { formatRate } from './format-stats';
import { OffValue, TRACKING_OFF_MESSAGE } from './off-value';

export type EmailCardAnalyticsData = {
  automationId: string;
  actionId: string;
  stats: AutomationEmailStats;
};

export const EMAIL_CARD_EASE = 'duration-200 ease-out motion-reduce:transition-none';

// React 18 has no `inert` prop.
const useInert = (hidden: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute('inert', hidden);
  }, [hidden]);
  return ref;
};

// Opens and closes to its content's height (grid rows 0fr ↔ 1fr).
export const EmailCardCollapse: React.FC<{ open: boolean; children: React.ReactNode }> = ({
  open,
  children,
}) => {
  const ref = useInert(!open);
  return (
    <div
      ref={ref}
      className={cn(
        'grid transition-[grid-template-rows,opacity]',
        EMAIL_CARD_EASE,
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-clip" style={{ overflowClipMargin: 4 }}>
        {children}
      </div>
    </div>
  );
};

// Hovering or focusing a rate reveals its member count; screen readers get both.
const Metric: React.FC<{
  icon: typeof LucideIcon.Send;
  label: string;
  large: boolean;
  value: string;
  tracked?: boolean;
  count?: string;
}> = ({ icon: Icon, label, large, value, tracked = true, count }) => {
  const revealsCount = tracked && count !== undefined;
  let spokenValue = value;
  if (!tracked) {
    spokenValue = TRACKING_OFF_MESSAGE;
  } else if (revealsCount) {
    spokenValue = `${value}, ${count} members`;
  }
  return (
    <div
      className={cn(
        'group/metric rounded-lg border text-left transition-[padding,border-color]',
        EMAIL_CARD_EASE,
        large ? 'border-border-default px-3 py-2.5' : 'border-transparent p-0',
        revealsCount &&
          'focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none',
      )}
      tabIndex={revealsCount ? 0 : undefined}
    >
      <span className="sr-only">{`${label}: ${spokenValue}`}</span>
      <div aria-hidden="true">
        <EmailCardCollapse open={large}>
          <Inline
            as="span"
            className={cn(
              'pb-1 text-sm',
              tracked ? 'text-text-secondary' : 'text-muted-foreground',
            )}
            gap="xs"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            {label}
          </Inline>
        </EmailCardCollapse>
        <Inline as="span" gap="none">
          <Icon
            className={cn(
              'shrink-0 text-muted-foreground transition-[width,margin,opacity]',
              EMAIL_CARD_EASE,
              large ? 'mr-0 w-0 opacity-0' : 'mr-1 w-4 opacity-100',
            )}
            strokeWidth={1.5}
          />
          {tracked ? (
            <span
              className={cn(
                'font-mono tabular-nums transition-[font-size,line-height,font-weight]',
                EMAIL_CARD_EASE,
                large ? 'text-xl font-semibold' : 'text-control font-normal',
              )}
            >
              {revealsCount ? (
                <>
                  <span className="group-hover/metric:hidden group-focus-visible/metric:hidden">
                    {value}
                  </span>
                  <span className="hidden group-hover/metric:inline group-focus-visible/metric:inline">
                    {count}
                  </span>
                </>
              ) : (
                value
              )}
            </span>
          ) : (
            <OffValue
              // tailwind-merge reads a bare `text-control` as a colour.
              className={large ? 'text-xl' : 'text-[length:var(--text-control)]'}
            />
          )}
        </Inline>
      </div>
    </div>
  );
};

export const EmailCardMetrics: React.FC<{
  large: boolean;
  noLinks: boolean;
  stats: AutomationEmailStats;
}> = ({ large, noLinks, stats }) => {
  const { emailTrackOpens, emailTrackClicks } = useEmailTrackingSettings();
  // With no links there was nothing to click, so 0% would mislead.
  const clickedRate = noLinks ? null : stats.clicked_rate;
  return (
    <Grid className="w-full" columns={3} gap="md">
      <Metric
        icon={POST_METRIC_ICONS.sent}
        label="Sent"
        large={large}
        value={formatNumber(stats.email_sent_count)}
      />
      <Metric
        count={stats.opened_rate === null ? undefined : formatNumber(stats.email_opened_count)}
        icon={POST_METRIC_ICONS.opens}
        label="Opened"
        large={large}
        tracked={emailTrackOpens}
        value={stats.opened_rate === null ? '—' : formatRate(stats.opened_rate)}
      />
      <Metric
        count={clickedRate === null ? undefined : formatNumber(stats.email_clicked_count)}
        icon={POST_METRIC_ICONS.clicks}
        label="Clicked"
        large={large}
        tracked={emailTrackClicks}
        value={clickedRate === null ? '—' : formatRate(clickedRate)}
      />
    </Grid>
  );
};

const MIDDLE_TRUNCATE_TAIL = 14;

const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '');

const ClickedLinksList: React.FC<{
  clickedCount: number;
  isError: boolean;
  isLoading: boolean;
  links: AutomationActionLink[];
  sentCount: number;
  onRetry: () => void;
}> = ({ clickedCount, isError, isLoading, links, sentCount, onRetry }) => {
  if (sentCount === 0) {
    return (
      <Text className="py-6 text-center" size="sm" tone="secondary">
        No emails sent yet.
      </Text>
    );
  }

  if (isLoading) {
    return (
      <Inline className="py-6" data-testid="automation-action-links-loading" justify="center">
        <LoadingIndicator size="sm" />
      </Inline>
    );
  }

  if (isError) {
    return (
      <Stack align="center" className="py-6" gap="sm">
        <Text className="text-center text-destructive" role="alert" size="sm">
          Couldn&apos;t load clicked links.
        </Text>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <DataList className="group/datalist">
        <DataListBody>
          {links.map((link) => {
            const percentage =
              clickedCount > 0 ? Math.min(link.clicked_count / clickedCount, 1) : 0;
            const url = displayUrl(link.url);
            return (
              <DataListRow key={link.url}>
                <DataListBar style={{ width: `${Math.round(percentage * 100)}%` }} />
                <DataListItemContent>
                  <a
                    aria-label={url}
                    className="block min-w-0 hover:underline"
                    href={link.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Inline as="span" className="min-w-0" gap="none">
                      <span className="truncate">
                        {url.slice(0, Math.max(0, url.length - MIDDLE_TRUNCATE_TAIL))}
                      </span>
                      <span className="shrink-0 whitespace-nowrap">
                        {url.slice(-MIDDLE_TRUNCATE_TAIL)}
                      </span>
                    </Inline>
                  </a>
                </DataListItemContent>
                <DataListItemValue>
                  <DataListItemValueAbs>{formatNumber(link.clicked_count)}</DataListItemValueAbs>
                  <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                </DataListItemValue>
              </DataListRow>
            );
          })}
        </DataListBody>
      </DataList>
    </TooltipProvider>
  );
};

const LinksEmptyState: React.FC<{
  description: string;
  icon: React.ReactNode;
  title: string;
}> = ({ description, icon, title }) => (
  <EmptyIndicator className="px-4 py-12" description={description} role="status" title={title}>
    {icon}
  </EmptyIndicator>
);

const noLinksState = (
  <LinksEmptyState
    description="Add links and publish to start tracking clicks"
    icon={<LucideIcon.Link />}
    title="No links in this email"
  />
);

// The list keeps its tallest page's height so the arrows don't move.
const LINKS_PER_PAGE = 10;

const PaginatedClickedLinks: React.FC<EmailCardAnalyticsData> = ({
  actionId,
  automationId,
  stats,
}) => {
  const sentCount = stats.email_sent_count;
  const { data, isError, isLoading, refetch } = useBrowseAutomationActionLinks(
    automationId,
    actionId,
    { defaultErrorHandler: false, enabled: sentCount > 0, refetchOnMount: 'always' },
  );
  const links = data?.automation_action_links ?? [];
  const { paginatedData, totalPages, nextPage, previousPage, hasNextPage, hasPreviousPage } =
    useSimplePagination({ data: links, itemsPerPage: LINKS_PER_PAGE });

  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  useLayoutEffect(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }
    const measure = () => setListHeight((tallest) => Math.max(tallest, element.offsetHeight));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  if (data && !isError && links.length === 0 && sentCount > 0) {
    return noLinksState;
  }

  // An invisible empty state sets the minimum height, so a few links aren't shorter than none.
  return (
    <div className="grid">
      <div aria-hidden="true" className="invisible col-start-1 row-start-1">
        {noLinksState}
      </div>
      <Stack className="col-start-1 row-start-1" gap="xs">
        <Text size="sm" tone="secondary">
          Unique clicks per link
        </Text>
        <div style={totalPages > 1 ? { minHeight: listHeight } : undefined}>
          <div ref={listRef}>
            <ClickedLinksList
              clickedCount={stats.email_clicked_count}
              isError={isError}
              isLoading={isLoading}
              links={paginatedData ?? []}
              sentCount={sentCount}
              onRetry={() => {
                void refetch();
              }}
            />
          </div>
        </div>
        {totalPages > 1 && (
          <SimplePagination className="justify-end pb-0">
            <SimplePaginationNavigation>
              {/* Icon-only in Admin 7, so each arrow needs a name. */}
              <SimplePaginationPreviousButton
                aria-label="Previous page"
                disabled={!hasPreviousPage}
                onClick={previousPage}
              />
              <SimplePaginationNextButton
                aria-label="Next page"
                disabled={!hasNextPage}
                onClick={nextPage}
              />
            </SimplePaginationNavigation>
          </SimplePagination>
        )}
      </Stack>
    </div>
  );
};

export const EmailCardClickedLinks: React.FC<EmailCardAnalyticsData> = (analytics) => {
  const { emailTrackClicks } = useEmailTrackingSettings();
  // With click tracking off there are no links to list or request.
  if (!emailTrackClicks) {
    return (
      <LinksEmptyState
        description="Manage in Analytics settings"
        icon={<LucideIcon.MousePointer2Off />}
        title="Click tracking is off"
      />
    );
  }
  return <PaginatedClickedLinks {...analytics} />;
};
