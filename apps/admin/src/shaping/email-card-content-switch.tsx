import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  EmptyIndicator,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  SimplePagination,
  SimplePaginationNavigation,
  SimplePaginationNextButton,
  SimplePaginationPreviousButton,
  inputSurface,
} from '@tryghost/shade/components';
import { Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber, useSimplePagination } from '@tryghost/shade/utils';
import { useParams } from '@tryghost/admin-x-framework';
import {
  type AutomationEmailStats,
  useBrowseAutomationActionLinks,
} from '@tryghost/admin-x-framework/api/automations';
import { isEmptyEmailLexical } from '@/automations/utils';
import { emailTextExcerpt } from '@/automations/utils/history-email-preview';
import { useEmailTrackingSettings } from '@/automations/hooks/use-email-tracking-settings';
import {
  AutomationCard,
  AutomationCardHeader,
} from '@/automations/components/canvas/automation-card';
import { AutomationCardMenu } from '@/automations/components/canvas/automation-card-menu';
import { AutomationCardWarning } from '@/automations/components/canvas/automation-card-warning';
import {
  EmailCardExcerpt,
  EmailCardMessage,
} from '@/automations/components/canvas/email-card-content';
import { TopClickedLinksContent } from '@/automations/components/canvas/email-performance-section';
import { formatRate } from '@/automations/components/canvas/format-stats';
import { OffValue } from '@/automations/components/canvas/off-value';
import { POST_METRIC_ICONS } from '@/posts/list/post-metric-icons';
import type { EditableEmailData } from '@/automations/components/canvas/editable-email-card';
import type { NodeContextMenuEntry } from '@/automations/components/canvas/nodes';

// EMAIL CARD OPTION B — "Content switch" (NY-1717). The real email card with its
// analytics inside it. An icon button beside the menu switches views: the
// subject and message preview collapse, the metrics row slides up and its
// values grow, and the top clicked links open below. One continuous layout rather than two swapped views, so each part
// moves instead of cutting. The card never gets shorter than the email view.
// Each card opens and closes on its own: opening one never closes another,
// which would shift the canvas under the reader.

const EASE = 'duration-200 ease-out motion-reduce:transition-none';
// EASE's duration, plus a frame or two to settle.
const TRANSITION_SETTLE_MS = 250;

const getEmailWarning = (email: EditableEmailData, errorMessage?: string) => {
  const missingSubject = !email.subject.trim();
  const missingBody = isEmptyEmailLexical(email.lexical);
  if (missingSubject && missingBody) {
    return 'Add a subject line and a message before this email can be sent.';
  }
  if (missingSubject) {
    return 'Add a subject line before this email can be sent.';
  }
  if (missingBody) {
    return 'Add a message before this email can be sent.';
  }
  return errorMessage;
};

// React 18 has no `inert` prop: hidden parts are kept out of the tab order and
// the accessibility tree by setting the attribute directly.
const useInert = (hidden: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute('inert', hidden);
  }, [hidden]);
  return ref;
};

// Opens and closes to its content's height (grid rows 0fr ↔ 1fr).
const Collapse: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => {
  const ref = useInert(!open);
  return (
    <div
      ref={ref}
      className={cn(
        'grid transition-[grid-template-rows,opacity]',
        EASE,
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-clip" style={{ overflowClipMargin: 4 }}>
        {children}
      </div>
    </div>
  );
};

// The card's metrics: a discreet 13px row in the email view, growing to
// headline figures in the analytics view.
const Metric: React.FC<{
  label: string;
  large: boolean;
  tracked?: boolean;
  // The count behind a rate: hovering or focusing the metric swaps the rate
  // for it, in both views, as the build's analytics panel does.
  count?: string;
  // The posts list's metric icons: beside the value when collapsed, leading
  // the label when expanded.
  icon: typeof LucideIcon.Send;
  children: React.ReactNode;
}> = ({ label, large, tracked = true, count, icon: Icon, children }) => {
  const revealsCount = tracked && count !== undefined;
  return (
    // Collapsed, an icon and its value, as the posts list shows metrics.
    // Expanded, a bordered box (like the analytics page's metric cards) with a
    // labelled row above a larger figure; the label row opens as it grows.
    <div
      aria-label={collapsedAriaLabel(label, large)}
      className={cn(
        'group/metric rounded-lg border text-left transition-[padding,border-color]',
        EASE,
        large ? 'border-border-default px-3 py-2.5' : 'border-transparent p-0',
        // Focusable for the swap; keyboard focus gets Shade's ring.
        revealsCount &&
          'focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none',
      )}
      role={large ? undefined : 'group'}
      tabIndex={revealsCount ? 0 : undefined}
    >
      <Collapse open={large}>
        <span
          className={cn(
            'flex items-center gap-1 pb-1 text-sm',
            tracked ? 'text-text-secondary' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          {label}
        </span>
      </Collapse>
      <span className="flex items-center">
        <Icon
          className={cn(
            'shrink-0 text-muted-foreground transition-[width,margin,opacity]',
            EASE,
            large ? 'mr-0 w-0 opacity-0' : 'mr-1 w-4 opacity-100',
          )}
          strokeWidth={1.5}
          aria-hidden
        />
        {tracked ? (
          <span
            className={cn(
              'font-mono tabular-nums transition-[font-size,line-height,font-weight]',
              EASE,
              large ? 'text-xl font-semibold' : 'text-control font-normal',
            )}
          >
            {revealsCount ? (
              <>
                <span className="group-hover/metric:hidden group-focus-visible/metric:hidden">
                  {children}
                </span>
                <span className="hidden group-hover/metric:inline group-focus-visible/metric:inline">
                  {count}
                </span>
              </>
            ) : (
              children
            )}
          </span>
        ) : (
          <OffValue
            // The length form: tailwind-merge reads a bare `text-control` as a
            // colour and would drop OffValue's muted grey.
            className={large ? 'text-xl' : 'text-[length:var(--text-control)]'}
          />
        )}
      </span>
    </div>
  );
};

// Collapsed, the label words are hidden, so the group carries the name.
const collapsedAriaLabel = (label: string, large: boolean) => (large ? undefined : label);

const Metrics: React.FC<{ stats: AutomationEmailStats; large: boolean; noLinks: boolean }> = ({
  stats,
  large,
  noLinks,
}) => {
  const { emailTrackOpens, emailTrackClicks } = useEmailTrackingSettings();
  return (
    <Grid className="w-full" columns={3} gap="md">
      <Metric icon={POST_METRIC_ICONS.sent} label="Sent" large={large}>
        {formatNumber(stats.email_sent_count)}
      </Metric>
      <Metric
        count={stats.opened_rate === null ? undefined : formatNumber(stats.email_opened_count)}
        icon={POST_METRIC_ICONS.opens}
        label="Opened"
        large={large}
        tracked={emailTrackOpens}
      >
        {stats.opened_rate === null ? '—' : formatRate(stats.opened_rate)}
      </Metric>
      <Metric
        count={
          stats.clicked_rate === null || noLinks
            ? undefined
            : formatNumber(stats.email_clicked_count)
        }
        icon={POST_METRIC_ICONS.clicks}
        label="Clicked"
        large={large}
        tracked={emailTrackClicks}
      >
        {/* "—" as the build shows for nothing sent, and also for an email
            with no links: there was nothing to click, so 0% would mislead. */}
        {stats.clicked_rate === null || noLinks ? '—' : formatRate(stats.clicked_rate)}
      </Metric>
    </Grid>
  );
};

// Every clicked link, ten to a page with the analytics screen's pagination
// (Shade's SimplePagination, as on a post's newsletter clicks). The list holds
// the height of its tallest page, so a short last page leaves space below
// rather than moving the arrows.
const LINKS_PER_PAGE = 10;

const PaginatedClickedLinks: React.FC<{
  actionId: string;
  automationId: string;
  clickedCount: number;
  sentCount: number;
}> = ({ actionId, automationId, clickedCount, sentCount }) => {
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

  // An email with no links: say so on its own, without the section title, with
  // the padding the automations screens give their empty states.
  const emptyState = (
    <EmptyIndicator
      className="px-4 py-12"
      description="Add links and publish to start tracking clicks"
      role="status"
      title="No links in this email"
    >
      <LucideIcon.Link />
    </EmptyIndicator>
  );
  if (data && !isError && links.length === 0 && sentCount > 0) {
    return emptyState;
  }

  // Never shorter than the empty state: an invisible copy of it shares the
  // grid cell and sets the section's minimum height, so an email with a link
  // or two isn't shorter than one with none.
  return (
    <div className="grid">
      <div className="invisible col-start-1 row-start-1" aria-hidden>
        {emptyState}
      </div>
      <Stack className="col-start-1 row-start-1" gap="xs">
        <Text size="sm" tone="secondary">
          Unique clicks per link
        </Text>
        <div style={totalPages > 1 ? { minHeight: listHeight } : undefined}>
          <div ref={listRef}>
            <TopClickedLinksContent
              clickedCount={clickedCount}
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
              <SimplePaginationPreviousButton disabled={!hasPreviousPage} onClick={previousPage} />
              <SimplePaginationNextButton disabled={!hasNextPage} onClick={nextPage} />
            </SimplePaginationNavigation>
          </SimplePagination>
        )}
      </Stack>
    </div>
  );
};

export const ContentSwitchEmailCard: React.FC<
  React.PropsWithChildren<{
    actionId: string;
    email: EditableEmailData;
    isNew: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
    stats?: AutomationEmailStats;
  }>
> = ({ actionId, email, isNew, errorMessage, menuItems, stats, children }) => {
  const { id: automationId } = useParams();
  const { emailTrackClicks } = useEmailTrackingSettings();
  const warning =
    email.suppressWarning && !errorMessage ? undefined : getEmailWarning(email, errorMessage);
  const text = useMemo(() => emailTextExcerpt(email.lexical), [email.lexical]);
  // The card's own view state, not the canvas's single selection.
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const canShowAnalytics = Boolean(stats) && Boolean(automationId);
  const showAnalytics = analyticsOpen && canShowAnalytics;

  // Whether the sent email had any links at all. The API has no flag for it,
  // so read the email's link list (shared, cached, with the analytics view's).
  const { data: linksData } = useBrowseAutomationActionLinks(automationId ?? '', actionId, {
    defaultErrorHandler: false,
    enabled: Boolean(automationId) && (stats?.email_sent_count ?? 0) > 0,
  });
  const noLinks = linksData?.automation_action_links.length === 0;

  // The email view's natural height, held as the content's minimum in both
  // views, so the card never dips below its default, including mid-switch while
  // one part collapses as the other opens. Measured on the inner element, which
  // the minimum doesn't stretch.
  const contentRef = useRef<HTMLDivElement>(null);
  const [emailViewHeight, setEmailViewHeight] = useState<number>();
  const measuredOnce = useRef(false);
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || showAnalytics) {
      return;
    }
    const observer = new ResizeObserver(() => setEmailViewHeight(element.offsetHeight));
    const start = () => observer.observe(element);
    // Back from analytics, the email view is still opening: measuring now would
    // catch it half-open and drop the minimum, so wait for it to settle.
    const timer = measuredOnce.current ? setTimeout(start, TRANSITION_SETTLE_MS) : undefined;
    if (!measuredOnce.current) {
      start();
      measuredOnce.current = true;
    }
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [showAnalytics]);

  // The links mount on first open, then stay mounted so closing can animate.
  const [linksMounted, setLinksMounted] = useState(false);
  useEffect(() => {
    if (showAnalytics) {
      setLinksMounted(true);
    }
  }, [showAnalytics]);

  return (
    <AutomationCard
      aria-label={email.subject ? `Send email: ${email.subject}` : 'Send email'}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        warning && 'border-state-warning',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={email.onInteract}
      onPointerDownCapture={email.onInteract}
    >
      {children}
      <AutomationCardHeader
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={warning} />
            {canShowAnalytics && (
              // One icon in both views: the pressed state, not a second icon,
              // says the analytics are showing. Pressed takes the look a ghost
              // button has while its menu is open, as the ⋯ beside it does.
              <Button
                aria-label="Email analytics"
                aria-pressed={showAnalytics}
                className="aria-pressed:bg-button-ghost-hover aria-pressed:shadow-control-pressed"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setAnalyticsOpen((open) => !open)}
              >
                <LucideIcon.ChartNoAxesColumn />
              </Button>
            )}
            <AutomationCardMenu label="Email actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.Mail className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Send email"
      />
      <div className="mt-3" style={{ minHeight: emailViewHeight }}>
        <div ref={contentRef}>
          {/* The editable email (subject and message preview) collapses away in
            the analytics view; the toggle brings it straight back. */}
          <Collapse open={!showAnalytics}>
            <Stack gap="md">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>Subject</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Subject line"
                  value={email.subject}
                  onChange={(event) => email.onUpdateSubject(event.target.value)}
                />
              </InputGroup>
              <EmailCardMessage aria-label="Email message preview" className="border-0 p-0">
                <button
                  aria-label="Edit email content"
                  className={cn(
                    inputSurface('self'),
                    'group/field flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted',
                  )}
                  type="button"
                  onClick={email.onEditContent}
                >
                  <EmailCardExcerpt className="line-clamp-5 min-h-[5lh] text-[length:var(--text-control)] text-muted-foreground">
                    {text || 'Message'}
                  </EmailCardExcerpt>
                  <LucideIcon.Pen
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none"
                    strokeWidth={2}
                  />
                </button>
              </EmailCardMessage>
            </Stack>
          </Collapse>
          {stats && (
            <div className={cn('transition-[padding]', EASE, showAnalytics ? 'pt-1' : 'pt-4')}>
              <Metrics large={showAnalytics} noLinks={noLinks} stats={stats} />
            </div>
          )}
          {stats && automationId && (
            <Collapse open={showAnalytics}>
              {linksMounted && (
                <div className="pt-6">
                  {emailTrackClicks ? (
                    <PaginatedClickedLinks
                      actionId={actionId}
                      automationId={automationId}
                      clickedCount={stats.email_clicked_count}
                      sentCount={stats.email_sent_count}
                    />
                  ) : (
                    // Click tracking is a site setting (Settings → Analytics →
                    // Email clicks); with it off there are no links to list.
                    <EmptyIndicator
                      className="px-4 py-12"
                      description="Manage in Analytics settings"
                      role="status"
                      title="Click tracking is off"
                    >
                      <LucideIcon.MousePointer2Off />
                    </EmptyIndicator>
                  )}
                </div>
              )}
            </Collapse>
          )}
        </div>
      </div>
    </AutomationCard>
  );
};
