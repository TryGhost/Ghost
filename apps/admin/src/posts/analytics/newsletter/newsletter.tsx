import Feedback from './components/feedback';
import KpiCard, {
  KpiCardContent,
  KpiCardLabel,
  KpiCardMoreButton,
  KpiCardValue,
} from '@/posts/analytics/components/kpi-card';
import PendingSendEmpty from '@/posts/analytics/prototype-analytics-status/pending-send-empty';
import PostAnalyticsContent from '@/posts/analytics/components/post-analytics-content';
import PostAnalyticsHeader from '@/posts/analytics/components/post-analytics-header';
import {
  Badge,
  BarChartLoadingIndicator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type ChartConfig,
  DataList,
  DataListBar,
  DataListBody,
  DataListItemContent,
  DataListItemValue,
  DataListItemValueAbs,
  DataListItemValuePerc,
  DataListRow,
  Input,
  Separator,
  SimplePagination,
  SimplePaginationNavigation,
  SimplePaginationNextButton,
  SimplePaginationPreviousButton,
  SkeletonTable,
} from '@tryghost/shade/components';
import { HTable } from '@tryghost/shade/primitives';
import {
  LucideIcon,
  formatNumber,
  formatPercentage,
  useSimplePagination,
} from '@tryghost/shade/utils';
import {
  NewsletterRadialChart,
  type NewsletterRadialChartData,
} from './components/newsletter-radial-chart';
import { type Post, usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { buildMembersUrl } from '@/members/api';
import { getLinkById } from '@/posts/analytics/utils/link-helpers';
import { hasBeenEmailed, useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import { useBulkEditLinks } from '@tryghost/admin-x-framework/api/links';
import { useEmailTrackClicks, useEmailTrackOpens } from '@tryghost/admin-x-framework/api/settings';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useCountedThrough,
  useDeliveryRingVariant,
  useEmailDataHiddenReason,
  useGatedUntilSentVariant,
  useSendingOnlyVariant,
  useProvisionalFigures,
  useSentAsDenominatorVariant,
} from '@/posts/analytics/prototype-analytics-status/use-status-copy';
import { FIXTURE_AVERAGE_DELIVERED_RATE } from '@/posts/analytics/prototype-analytics-status/prototype-context';
import { useStubbedNewsletterStats } from '@/posts/analytics/prototype-analytics-status/use-stubbed-newsletter-stats';
import { usePostNewsletterStats } from '@/posts/analytics/hooks/use-post-newsletter-stats';
import { useResponsiveChartSize } from '@/posts/analytics/hooks/use-responsive-chart-size';

const FunnelArrow: React.FC = () => {
  return (
    <div className="absolute top-1/2 -right-4 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground md:visible! md:flex!">
      <LucideIcon.ChevronRight className="ml-0.5" size={16} strokeWidth={1.5} />
    </div>
  );
};

interface BlockTooltipProps {
  dataColor: string;
  value: string;
  avgValue: string;
}

const BlockTooltip: React.FC<BlockTooltipProps> = ({ dataColor, value, avgValue }) => {
  return (
    <div className="absolute top-6 left-1/2 z-50 flex w-[200px] -translate-x-1/2 flex-col items-stretch gap-1.5 rounded-md bg-background px-4 py-2 text-sm opacity-0 shadow-md transition-all group-hover/block:top-3 group-hover/block:opacity-100">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div
            className="size-2 rounded-full bg-chart-blue opacity-50"
            style={{
              backgroundColor: dataColor,
            }}
          ></div>
          This newsletter
        </div>
        <div className="text-right font-mono">{value}</div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-2 rounded-full bg-chart-gray opacity-80"></div>
          Average
        </div>
        <div className="text-right font-mono">{avgValue}</div>
      </div>
    </div>
  );
};

interface DeliveryTooltipProps {
  delivered: number;
  bounced: number;
  inProgress: number;
  total: number;
}

// PROTOTYPE: variant F's hover for the delivery ring. The ring shows one
// share; this is where the other two go — what bounced, and what has not
// reported back yet — so the three always add up to the list the tile counts.
const DeliveryTooltip: React.FC<DeliveryTooltipProps> = ({
  delivered,
  bounced,
  inProgress,
  total,
}) => {
  const rows = [
    { label: 'Delivered', value: delivered, dot: 'bg-chart-purple opacity-50' },
    { label: 'Bounced', value: bounced, dot: 'bg-state-danger' },
    { label: 'Still in progress', value: inProgress, dot: 'bg-chart-gray opacity-80' },
  ];

  return (
    <div className="absolute top-6 left-1/2 z-50 flex w-[240px] -translate-x-1/2 flex-col items-stretch gap-1.5 rounded-md bg-background px-4 py-2 text-sm opacity-0 shadow-md transition-all group-hover/block:top-3 group-hover/block:opacity-100">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className={`size-2 rounded-full ${row.dot}`}></div>
            {row.label}
          </div>
          <div className="text-right font-mono tabular-nums">
            {formatNumber(row.value)}
            <span className="ml-1.5 text-muted-foreground">
              {formatPercentage(total > 0 ? row.value / total : 0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const Newsletter: React.FC = () => {
  const navigate = useNavigate();
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editedUrl, setEditedUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;
  const { chartSize } = useResponsiveChartSize();
  const emailTrackClicksEnabled = useEmailTrackClicks();
  const emailTrackOpensEnabled = useEmailTrackOpens();

  // Use shared post data from context
  const { post, isPostLoading, postId } = usePostAnalytics();
  const navigateToMembers = (filter: string) => navigate(buildMembersUrl({ filter }));
  const typedPost = post as Post;
  // Use the utility function from admin-x-framework
  const showNewsletterSection = hasBeenEmailed(typedPost);

  useEffect(() => {
    // Redirect to overview if the post wasn't sent as a newsletter
    if (!isPostLoading && !showNewsletterSection) {
      navigate(`/posts/analytics/${postId}`);
    }
  }, [navigate, postId, isPostLoading, showNewsletterSection]);

  const {
    stats: realStats,
    averageStats,
    topLinks,
    isLoading: isNewsletterStatsLoading,
    refetchTopLinks,
  } = usePostNewsletterStats(postId);
  // PROTOTYPE: the funnel runs on the switcher's fixture, so the numbers here
  // describe the same send the status line above them does.
  const stats = useStubbedNewsletterStats(realStats);
  const { mutate: editLinks } = useBulkEditLinks();

  // Calculate feedback stats from the post data
  const feedbackStats = useMemo(() => {
    if (!typedPost?.count) {
      return {
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalFeedback: 0,
      };
    }

    const positiveFeedback = typedPost.count.positive_feedback || 0;
    const negativeFeedback = typedPost.count.negative_feedback || 0;
    const totalFeedback = positiveFeedback + negativeFeedback;

    return {
      positiveFeedback,
      negativeFeedback,
      totalFeedback,
    };
  }, [typedPost]);

  // Check if feedback is enabled for the newsletter
  const isFeedbackEnabled = useMemo(() => {
    return typedPost?.newsletter?.feedback_enabled === true;
  }, [typedPost]);

  // Determine if feedback component should be shown
  // PROTOTYPE: the footer is pagination for a list that is not being shown.
  const emailDataHiddenReason = useEmailDataHiddenReason();
  const isEmailDataHidden = emailDataHiddenReason !== null;
  // PROTOTYPE: a rate carries no timestamp of its own.
  const countedThrough = useCountedThrough();
  // PROTOTYPE: variant D — the card above reports sending, so this tile reports
  // what came back of it.
  const isSendingOnly = useSendingOnlyVariant();
  // PROTOTYPE: variant E — everything below waits for the send to finish, so
  // while it is pending the empty states name the send as the thing being
  // waited on, rather than the first recorded result. Only while pending:
  // a partial or failed send keeps the shared permanent copy.
  const isGatedUntilSent = useGatedUntilSentVariant();
  const isSendingGated = isGatedUntilSent && emailDataHiddenReason === 'pending';
  // PROTOTYPE: variant F — E's tile, but the ring beneath it counts deliveries.
  const isDeliveryRing = useDeliveryRingVariant();
  // PROTOTYPE: variant G — Sent leaves the funnel for the subtitle, and the
  // first position becomes Delivered: a metric with the same anatomy as the
  // two beside it (count, rate, average, hover).
  const isSentDenominator = useSentAsDenominatorVariant();
  // PROTOTYPE: once the gate opens the figures are real but still rising.
  // Testing was unanimous that a provisional number in final chrome — a rate
  // ring, an Average to fall short of — reads as a failed send. So while
  // counting runs: no Average rings, no comparison hovers, labels say "so
  // far", and a strip above the card says the numbers are still moving.
  const isProvisional = useProvisionalFigures();
  const withoutAverage = (data: NewsletterRadialChartData[]) =>
    isProvisional ? data.filter((entry) => entry.datatype !== 'Average') : data;
  // PROTOTYPE: variant E drops the clicks card entirely while the send is
  // running — a card whose whole body is "not yet" earns no place on the page;
  // it arrives with the data, once the send is done.
  const showClicksCard = emailTrackClicksEnabled && !isSendingGated;
  // An absent value, at display size. An em dash at 2.6rem semibold is a slab —
  // heavier than the figures it stands in for, so the eye lands on the three
  // things that are missing before anything that is there. Narrower character,
  // not bold, and back to the tile's own muted colour that KpiCardValue
  // overrides to foreground: a placeholder belongs with the label above it,
  // not with the figures it is standing in for.
  const noValue = <span className="font-normal text-muted-foreground">&ndash;</span>;

  const shouldShowFeedback = useMemo(() => {
    // Show feedback if there's any feedback data, regardless of feedback_enabled setting
    if (feedbackStats.totalFeedback > 0) {
      return true;
    }

    // Show feedback if feedback is enabled (even if no feedback yet)
    return isFeedbackEnabled;
  }, [feedbackStats.totalFeedback, isFeedbackEnabled]);

  const handleEdit = (linkId: string) => {
    const link = getLinkById(topLinks, linkId);
    if (link) {
      setEditingLinkId(linkId);
      setEditedUrl(link.link.to);
    }
  };

  const handleUpdate = () => {
    if (!editingLinkId) {
      return;
    }
    const link = getLinkById(topLinks, editingLinkId);
    if (!link) {
      return;
    }
    const trimmedUrl = editedUrl.trim();
    if (trimmedUrl === '' || trimmedUrl === link.link.to) {
      setEditingLinkId(null);
      setEditedUrl('');
      return;
    }
    editLinks(
      {
        originalUrl: link.link.originalTo,
        editedUrl: editedUrl,
        postId: postId,
      },
      {
        onSuccess: () => {
          setEditingLinkId(null);
          setEditedUrl('');
          void refetchTopLinks();
        },
        onError: () => {
          toast.error('Couldn’t update the link. Please try again.');
        },
      },
    );
  };

  // Pagination for topLinks
  const {
    totalPages,
    paginatedData: paginatedTopLinks,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = useSimplePagination({
    data: topLinks,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  useEffect(() => {
    if (editingLinkId && inputRef.current) {
      inputRef.current.focus();
      const link = getLinkById(topLinks, editingLinkId);

      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          if (editedUrl === link?.link.to) {
            setEditingLinkId(null);
            setEditedUrl('');
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingLinkId, editedUrl, topLinks]);

  const isLoading = isNewsletterStatsLoading || isPostLoading;

  // "Sent" Chart
  // PROTOTYPE: the ring was handed a hardcoded 1, so a send a third of the way
  // through drew a full circle reading 100% directly above a figure reading
  // 31,500 of 87,420. It now tracks what has actually gone out — which on a
  // completed send is still 1, so nothing changes once a send is done.
  //
  // PROTOTYPE: under D the tile is Delivered, so the numerator is deliveries
  // and bounces are excluded — the ring then falls a hair short of full on a
  // finished send, which is correct and is the reason the tile was relabelled.
  // The denominator stays the addressed list in both, so the ring answers the
  // same question its label asks: what share of everyone got there.
  // PROTOTYPE: under E, Sent means dispatched — the send the retired line was
  // counting — rather than landed, so a completed send reads 100% instead of
  // falling short by whatever has not reported back yet.
  const sentLabel = isSendingOnly || isSentDenominator ? 'Delivered' : 'Sent';
  const sentValue =
    isSendingOnly || isSentDenominator
      ? stats.delivered
      : isGatedUntilSent
        ? stats.dispatched
        : stats.sent;
  const sentRate = stats.addressed > 0 ? sentValue / stats.addressed : 0;

  // PROTOTYPE: under F the tile and the ring answer two different questions.
  // The tile says Sent 547,120 — did it go out — and holds there. The ring
  // says how much of that list has landed, filling from near-empty at
  // gate-open toward the delivered share, so the delivery tail is visible as
  // the gap between a full number and a ring still filling.
  const ringRate =
    isDeliveryRing || isSentDenominator
      ? stats.addressed > 0
        ? stats.delivered / stats.addressed
        : 0
      : sentRate;
  // G names the rate the way the rings beside it do, so the three read as one
  // series: Delivery rate → Open rate → Click rate.
  const ringLabelBase = isSentDenominator
    ? 'Delivery rate'
    : isDeliveryRing
      ? 'Delivered'
      : sentLabel;
  const ringLabel =
    isProvisional && (isSentDenominator || isDeliveryRing)
      ? `${ringLabelBase} so far`
      : ringLabelBase;

  const sentChartData: NewsletterRadialChartData[] = isSentDenominator
    ? [
        {
          datatype: 'Average',
          value: FIXTURE_AVERAGE_DELIVERED_RATE,
          fill: 'url(#gradientGray)',
          color: 'var(--chart-gray)',
        },
        {
          datatype: 'This newsletter',
          value: ringRate,
          fill: 'url(#gradientPurple)',
          color: 'var(--chart-purple)',
        },
      ]
    : [
        {
          datatype: ringLabel,
          value: ringRate,
          fill: 'url(#gradientPurple)',
          color: 'var(--chart-purple)',
        },
      ];

  const sentChartConfig = {
    percentage: {
      label: 'O',
    },
    Average: {
      label: 'Average',
    },
    'This newsletter': {
      label: 'This newsletter',
    },
  } satisfies ChartConfig;

  // "Opened" Chart
  const openedChartData: NewsletterRadialChartData[] = [
    {
      datatype: 'Average',
      value: averageStats.openedRate,
      fill: 'url(#gradientGray)',
      color: 'var(--chart-gray)',
    },
    {
      datatype: 'This newsletter',
      value: stats.openedRate,
      fill: 'url(#gradientBlue)',
      color: 'var(--chart-blue)',
    },
  ];

  const openedChartConfig = {
    percentage: {
      label: 'Opened',
    },
    Average: {
      label: 'Average',
    },
    'This newsletter': {
      label: 'This newsletter',
    },
  } satisfies ChartConfig;

  // "Clicked" Chart
  const clickedChartData: NewsletterRadialChartData[] = [
    {
      datatype: 'Average',
      value: averageStats.clickedRate,
      fill: 'url(#gradientGray)',
      color: 'var(--chart-gray)',
    },
    {
      datatype: 'This newsletter',
      value: stats.clickedRate,
      fill: 'url(#gradientTeal)',
      color: 'var(--chart-teal)',
    },
  ];

  const clickedChartConfig = {
    percentage: {
      label: 'Clicked',
    },
    Average: {
      label: 'Average',
    },
    'This newsletter': {
      label: 'This newsletter',
    },
  } satisfies ChartConfig;

  let chartHeaderClass = 'grid-cols-3';
  let chartClass =
    'aspect-[16/10] w-full max-w-[320px] sm:aspect-[2/1] md:aspect-[10/14] md:max-w-none lg:aspect-square';

  if (!emailTrackClicksEnabled || !emailTrackOpensEnabled) {
    chartHeaderClass = 'grid-cols-2';
    chartClass =
      'aspect-[16/10] w-full max-w-[320px] sm:aspect-[2/1] md:aspect-square md:max-w-none lg:aspect-[15/10]';
  }
  if (!emailTrackClicksEnabled && !emailTrackOpensEnabled) {
    chartHeaderClass = 'grid-cols-1';
    chartClass =
      'aspect-square w-full sm:aspect-[16/10] md:max-w-[320px] md:max-h-[320px] lg:aspect-[12/10]';
  }

  return (
    <>
      <PostAnalyticsHeader currentTab="Newsletter" />
      <PostAnalyticsContent>
        <div
          className={`grid grid-cols-1 gap-6 ${shouldShowFeedback && showClicksCard && 'lg:grid-cols-2'}`}
        >
          <Card className={shouldShowFeedback && showClicksCard ? 'lg:col-span-2' : ''}>
            <CardHeader className="hidden">
              <CardTitle>Newsletters</CardTitle>
              <CardDescription>How did this post perform</CardDescription>
            </CardHeader>
            {isLoading ? (
              <CardContent className="h-[25vw] p-6">
                <BarChartLoadingIndicator />
              </CardContent>
            ) : (
              <CardContent className="p-0">
                {/* PROTOTYPE: the caveat belongs inside the card, in the same
                    light as the figures it is about. */}
                {/* PROTOTYPE: the tiles stay so the card keeps its shape, but
                    dimmed and inert — nothing here is a link worth following
                    while the numbers behind it are not there yet. */}
                {/* PROTOTYPE: while counting runs the card says so, once, at the
                    top — with how current the figures are and what moves them. */}
                {isProvisional && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/30 px-6 py-2.5 text-sm text-muted-foreground">
                    <span>
                      Still counting — these figures will keep rising until every email has been
                      counted.
                    </span>
                    {countedThrough && <Badge variant="secondary">{countedThrough}</Badge>}
                    <span>Refresh for the latest.</span>
                  </div>
                )}
                {/* PROTOTYPE: variant G — Sent as the denominator, given a row of
                    its own above the three rates it divides. Same KPI anatomy
                    as the tiles below so it reads as the top of the same
                    hierarchy, not as metadata; a neutral dot because it is the
                    size of the thing being measured, not a metric.

                    It is the one figure the gate does not hide. The rates
                    below have nothing to say mid-send, but the denominator is
                    known before the first email leaves — it is the recipient
                    list — so the row states it from the start as "Sending to"
                    and turns to "Sent" at completion. A partial or failed send
                    withholds it like everything else: the number would be
                    false. */}
                {isSentDenominator && (
                  <div
                    className={`border-b ${isEmailDataHidden && !isSendingGated ? 'pointer-events-none opacity-40' : ''}`}
                  >
                    <KpiCard className="group relative isolate grow p-3 md:px-6 md:py-5">
                      <KpiCardMoreButton
                        onClick={() => {
                          navigateToMembers(`emails.post_id:${postId}`);
                        }}
                      >
                        View members &rarr;
                      </KpiCardMoreButton>
                      <KpiCardLabel
                        onClick={() => {
                          navigateToMembers(`emails.post_id:${postId}`);
                        }}
                      >
                        <div className="ml-0.5 size-[9px] rounded-full bg-muted-foreground opacity-50"></div>
                        {isSendingGated ? (
                          'Sending to'
                        ) : (
                          <>
                            Sent
                            {!isEmailDataHidden && (
                              <LucideIcon.Check
                                className="text-state-success"
                                size={14}
                                strokeWidth={2.5}
                              />
                            )}
                          </>
                        )}
                      </KpiCardLabel>
                      <KpiCardContent>
                        <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
                          {isSendingGated
                            ? formatNumber(stats.addressed)
                            : isEmailDataHidden
                              ? noValue
                              : formatNumber(stats.dispatched)}
                        </KpiCardValue>
                      </KpiCardContent>
                    </KpiCard>
                  </div>
                )}
                <div
                  className={`grid ${chartHeaderClass} items-stretch border-b ${
                    isEmailDataHidden ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  <KpiCard className="group relative isolate grow p-3 md:px-6 md:py-5">
                    <KpiCardMoreButton
                      onClick={() => {
                        navigateToMembers(`emails.post_id:${postId}`);
                      }}
                    >
                      View members &rarr;
                    </KpiCardMoreButton>
                    <KpiCardLabel
                      onClick={() => {
                        navigateToMembers(`emails.post_id:${postId}`);
                      }}
                    >
                      <div className="ml-0.5 size-[9px] rounded-full bg-chart-purple opacity-50"></div>
                      {/* PROTOTYPE: the status line reads "31,500 of 87,420"; a
                          bare "Sent 31,500" beside it looks like a second,
                          slightly different claim about the same send. Same
                          denominator, same phrasing, one fact stated twice.

                          Under D the denominator is stated permanently rather
                          than only while the two diverge. The card above
                          retires when sending finishes, and it is the thing
                          that had been carrying the size of the send — drop
                          the "of 87,420" at the same moment and a reader
                          arriving an hour later has a delivery count with
                          nothing to read it against. */}
                      {isSendingOnly
                        ? `Delivered of ${formatNumber(stats.addressed)}`
                        : isSentDenominator
                          ? 'Delivered'
                          : !isEmailDataHidden && stats.addressed > sentValue
                            ? `Sent of ${formatNumber(stats.addressed)}`
                            : 'Sent'}
                    </KpiCardLabel>
                    <KpiCardContent>
                      <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
                        {isEmailDataHidden ? noValue : formatNumber(sentValue)}
                      </KpiCardValue>
                    </KpiCardContent>
                  </KpiCard>

                  {emailTrackOpensEnabled && (
                    <KpiCard className="p-3 md:px-6 md:py-5">
                      <KpiCardMoreButton
                        onClick={() => {
                          navigateToMembers(`opened_emails.post_id:${postId}`);
                        }}
                      >
                        View members &rarr;
                      </KpiCardMoreButton>
                      <KpiCardLabel
                        onClick={() => {
                          navigateToMembers(`opened_emails.post_id:${postId}`);
                        }}
                      >
                        <div className="ml-0.5 size-[9px] rounded-full bg-chart-blue opacity-50"></div>
                        Opened
                        {!isEmailDataHidden && countedThrough && (
                          <Badge variant="secondary">{countedThrough}</Badge>
                        )}
                      </KpiCardLabel>
                      <KpiCardContent>
                        <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
                          {isEmailDataHidden ? noValue : formatNumber(stats.opened)}
                        </KpiCardValue>
                      </KpiCardContent>
                    </KpiCard>
                  )}

                  {emailTrackClicksEnabled && (
                    <KpiCard className="group relative isolate grow p-3 md:px-6 md:py-5">
                      <KpiCardMoreButton
                        onClick={() => {
                          navigateToMembers(`clicked_links.post_id:${postId}`);
                        }}
                      >
                        View members &rarr;
                      </KpiCardMoreButton>
                      <KpiCardLabel
                        onClick={() => {
                          navigateToMembers(`clicked_links.post_id:${postId}`);
                        }}
                      >
                        <div className="ml-0.5 size-[9px] rounded-full bg-chart-teal opacity-50"></div>
                        Clicked
                      </KpiCardLabel>
                      <KpiCardContent>
                        <KpiCardValue className="text-xl leading-none sm:text-2xl md:text-[2.6rem]">
                          {isEmailDataHidden ? noValue : formatNumber(stats.clicked)}
                        </KpiCardValue>
                      </KpiCardContent>
                    </KpiCard>
                  )}
                </div>
                <PendingSendEmpty
                  description={
                    isSendingGated
                      ? 'Sends, opens and clicks will appear once every email has been sent'
                      : "Once the first opens and clicks are recorded, they'll show here"
                  }
                  title={
                    isSendingGated
                      ? 'This newsletter is still sending'
                      : 'No newsletter data available'
                  }
                >
                  <div
                    className={`$ mx-auto grid grid-cols-1 items-center justify-center gap-4 transition-all md:gap-0 ${chartHeaderClass === 'grid-cols-2' && 'md:grid-cols-2'} ${chartHeaderClass === 'grid-cols-3' && 'md:grid-cols-3'}`}
                  >
                    <div
                      className={`relative border-r-0 px-6 ${isDeliveryRing || isSentDenominator ? 'group/block transition-all hover:bg-muted/25' : ''} ${(emailTrackOpensEnabled || emailTrackClicksEnabled) && 'md:border-r'}`}
                    >
                      {/* G: the same hover as every other ring, because it is
                          every other ring. */}
                      {isSentDenominator && !isEmailDataHidden && !isProvisional && (
                        <BlockTooltip
                          avgValue={formatPercentage(FIXTURE_AVERAGE_DELIVERED_RATE)}
                          dataColor="var(--chart-purple)"
                          value={formatPercentage(ringRate)}
                        />
                      )}
                      {isDeliveryRing && !isEmailDataHidden && (
                        <DeliveryTooltip
                          bounced={stats.sent - stats.delivered}
                          delivered={stats.delivered}
                          inProgress={stats.dispatched - stats.sent}
                          total={stats.addressed}
                        />
                      )}
                      <NewsletterRadialChart
                        className={chartClass}
                        config={sentChartConfig}
                        data={withoutAverage(sentChartData)}
                        percentageLabel={ringLabel}
                        percentageValue={formatPercentage(ringRate)}
                        size={chartSize}
                        tooltip={false}
                      />
                      {(emailTrackOpensEnabled || emailTrackClicksEnabled) && <FunnelArrow />}
                    </div>

                    {emailTrackOpensEnabled && (
                      <div
                        className={`group/block relative border-r-0 px-6 transition-all hover:bg-muted/25 ${emailTrackClicksEnabled && 'md:border-r'}`}
                      >
                        {!isProvisional && (
                          <BlockTooltip
                            avgValue={formatPercentage(averageStats.openedRate)}
                            dataColor="var(--chart-blue)"
                            value={formatPercentage(stats.openedRate)}
                          />
                        )}
                        <NewsletterRadialChart
                          className={chartClass}
                          config={openedChartConfig}
                          data={withoutAverage(openedChartData)}
                          percentageLabel={isProvisional ? 'Open rate so far' : 'Open rate'}
                          percentageValue={formatPercentage(stats.openedRate)}
                          size={chartSize}
                          tooltip={false}
                        />
                        {emailTrackClicksEnabled && <FunnelArrow />}
                      </div>
                    )}

                    {emailTrackClicksEnabled && (
                      <div className="group/block relative px-6 transition-all hover:bg-muted/25">
                        {!isProvisional && (
                          <BlockTooltip
                            avgValue={formatPercentage(averageStats.clickedRate)}
                            dataColor="var(--chart-teal)"
                            value={formatPercentage(stats.clickedRate)}
                          />
                        )}
                        <NewsletterRadialChart
                          className={chartClass}
                          config={clickedChartConfig}
                          data={withoutAverage(clickedChartData)}
                          percentageLabel={isProvisional ? 'Click rate so far' : 'Click rate'}
                          percentageValue={formatPercentage(stats.clickedRate)}
                          size={chartSize}
                          tooltip={false}
                        />
                      </div>
                    )}
                  </div>
                </PendingSendEmpty>
              </CardContent>
            )}
          </Card>

          {shouldShowFeedback && <Feedback feedbackStats={feedbackStats} />}

          {showClicksCard && (
            <Card className="group/datalist overflow-hidden">
              <div className="flex items-center justify-between p-6">
                <CardHeader className="p-0">
                  <CardTitle>Newsletter clicks</CardTitle>
                  <CardDescription>Which links resonated with your readers</CardDescription>
                </CardHeader>
                <HTable className="mr-2">Members</HTable>
              </div>
              {isLoading ? (
                <CardContent className="p-6 pt-0">
                  <Separator />
                  <SkeletonTable className="mt-6" />
                </CardContent>
              ) : (
                <CardContent className="pb-0">
                  <PendingSendEmpty
                    description="Once the first clicks are recorded, they'll show here"
                    title="No click data available"
                  >
                    <Separator />
                    {topLinks.length > 0 ? (
                      <DataList className="">
                        <DataListBody>
                          {paginatedTopLinks?.map((link) => {
                            const percentage = stats.clicked > 0 ? link.count / stats.clicked : 0;
                            const linkId = link.link.link_id;
                            const title = link.link.title;
                            const url = link.link.to;
                            const edited = link.link.edited;

                            return (
                              <DataListRow key={linkId}>
                                {editingLinkId !== linkId && (
                                  <DataListBar
                                    style={{
                                      width: `${percentage ? Math.round(percentage * 100) : 0}%`,
                                    }}
                                  />
                                )}
                                <DataListItemContent className="w-full">
                                  {editingLinkId === linkId ? (
                                    <div
                                      ref={containerRef}
                                      className="flex w-full items-center gap-2"
                                    >
                                      <Input
                                        ref={inputRef}
                                        className="z-50 h-7 w-full border-border bg-background text-sm"
                                        value={editedUrl}
                                        onChange={(e) => setEditedUrl(e.target.value)}
                                      />
                                      <Button size="sm" onClick={handleUpdate}>
                                        Update
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button
                                        className="mr-2 shrink-0 bg-background"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(linkId)}
                                      >
                                        <LucideIcon.Pen />
                                      </Button>
                                      <a
                                        className="block truncate font-medium hover:underline"
                                        href={url}
                                        rel="noreferrer"
                                        target="_blank"
                                        title={title}
                                      >
                                        {title}
                                      </a>
                                      {edited && (
                                        <span className="ml-1 text-gray-500">(edited)</span>
                                      )}
                                    </>
                                  )}
                                </DataListItemContent>
                                <DataListItemValue>
                                  <DataListItemValueAbs>
                                    {formatNumber(link.count || 0)}
                                  </DataListItemValueAbs>
                                  <DataListItemValuePerc>
                                    {formatPercentage(percentage)}
                                  </DataListItemValuePerc>
                                </DataListItemValue>
                              </DataListRow>
                            );
                          })}
                        </DataListBody>
                      </DataList>
                    ) : (
                      <div className="py-20 text-center text-sm text-gray-700">
                        You have no links in your post.
                      </div>
                    )}
                  </PendingSendEmpty>
                </CardContent>
              )}

              {!isLoading && !isEmailDataHidden && topLinks.length > 1 && (
                <CardFooter>
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="mt-2 flex items-start gap-2 pl-4 text-sm text-green">
                      <LucideIcon.ArrowUp size={20} strokeWidth={1.5} />
                      Sent a broken link? You can update it!
                    </div>
                    {totalPages > 1 && (
                      <SimplePagination className="pb-0">
                        <SimplePaginationNavigation>
                          <SimplePaginationPreviousButton
                            disabled={!hasPreviousPage}
                            onClick={previousPage}
                            // size='default'
                          />
                          <SimplePaginationNextButton
                            disabled={!hasNextPage}
                            onClick={nextPage}
                            // size='default'
                          />
                        </SimplePaginationNavigation>
                      </SimplePagination>
                    )}
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </PostAnalyticsContent>
    </>
  );
};

export default Newsletter;
