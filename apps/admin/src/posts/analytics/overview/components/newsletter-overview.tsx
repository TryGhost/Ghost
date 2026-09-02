import React, { useMemo } from 'react';
// PROTOTYPE: analytics status treatments — remove with ../../prototype-analytics-status
import PendingSendEmpty from '@/posts/analytics/prototype-analytics-status/pending-send-empty';
import {
  useCountedThrough,
  useEmailDataHiddenReason,
  useGatedUntilSentVariant,
} from '@/posts/analytics/prototype-analytics-status/use-status-copy';
import { useStubbedNewsletterStats } from '@/posts/analytics/prototype-analytics-status/use-stubbed-newsletter-stats';
import SendStageCard from '@/posts/analytics/prototype-analytics-status/send-stage-card';
import {
  Badge,
  BarChartLoadingIndicator,
  Button,
  Card,
  CardContent,
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
  Separator,
} from '@tryghost/shade/components';
import { HTable } from '@tryghost/shade/primitives';
import { KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue } from '@tryghost/shade/patterns';
import { LucideIcon, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import {
  NewsletterRadialChart,
  type NewsletterRadialChartData,
} from '@/posts/analytics/newsletter/components/newsletter-radial-chart';
import { type Post } from '@tryghost/admin-x-framework/api/posts';
import { cleanTrackedUrl, processAndGroupTopLinks } from '@/posts/analytics/utils/link-helpers';
import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { useNewsletterCards } from '@/posts/analytics/prototype-analytics-status/use-status-copy';
import { useTopLinks } from '@tryghost/admin-x-framework/api/links';

interface NewsletterOverviewProps {
  post: Post;
  isNewsletterStatsLoading: boolean;
  isWebShown?: boolean;
}

const NewsletterOverview: React.FC<NewsletterOverviewProps> = ({
  post,
  isNewsletterStatsLoading,
  isWebShown,
}) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  // PROTOTYPE: the progress card runs until every sent email is accounted for;
  // this card returns as soon as its numbers mean anything. In between, both.
  const { showProgress, showPerformance } = useNewsletterCards();
  // PROTOTYPE: "View more" goes to the newsletter tab, which is empty for the
  // same reason this card is. Offering the trip is offering a dead end.
  const emailDataHiddenReason = useEmailDataHiddenReason();
  const isEmailDataHidden = emailDataHiddenReason !== null;
  // PROTOTYPE: variant E — while the send is still running, the empty state
  // names the send as the thing being waited on rather than the first result.
  const isGatedUntilSent = useGatedUntilSentVariant();
  const isSendingGated = isGatedUntilSent && emailDataHiddenReason === 'pending';
  // PROTOTYPE: a rate carries no timestamp of its own.
  const countedThrough = useCountedThrough();

  // Calculate stats from post data
  const realStats = useMemo(() => {
    const opened = post.email?.opened_count || 0;
    const sent = post.email?.email_count || 0;
    const clicked = post.count?.clicks || 0;

    return {
      opened,
      clicked,
      openedRate: sent > 0 ? opened / sent : 0,
      clickedRate: sent > 0 ? clicked / sent : 0,
      sent: sent,
    };
  }, [post]);

  // PROTOTYPE: same fixture as the status treatments, so this card and the
  // progress card above it are never describing two different sends.
  const stats = useStubbedNewsletterStats(realStats);

  // Get top links for this post
  const { data: linksResponse } = useTopLinks({
    searchParams: {
      filter: `post_id:'${postId}'`,
    },
  });

  const topLinks = useMemo(() => {
    return processAndGroupTopLinks(linksResponse);
  }, [linksResponse]);

  // "Clicked" Chart
  const commonChartData: NewsletterRadialChartData[] = [
    {
      datatype: 'Clicked',
      value: stats.clickedRate,
      fill: 'url(#gradientTeal)',
      color: 'var(--chart-teal)',
    },
    {
      datatype: 'Opened',
      value: stats.openedRate,
      fill: 'url(#gradientBlue)',
      color: 'var(--chart-blue)',
    },
  ];

  const commonChartConfig = {
    percentage: {
      label: 'Opened',
    },
    Average: {
      label: 'Clicked',
    },
    'This newsletter': {
      label: 'Opened',
    },
  } satisfies ChartConfig;

  const fullWidth = post.email_only || !isWebShown;

  // Both card variants live in this slot; each renders null unless the switcher
  // has selected it, so only one is ever on screen.
  const progressCard = showProgress ? <SendStageCard fullWidth={fullWidth} /> : null;

  if (!showPerformance) {
    return progressCard;
  }

  return (
    <>
      {progressCard}
      <Card className={`group/datalist overflow-hidden ${fullWidth && 'col-span-2'}`}>
        <div className="relative flex items-center justify-between gap-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-lg">
              <LucideIcon.Mail size={16} strokeWidth={1.5} />
              Newsletter performance
            </CardTitle>
          </CardHeader>
          {!isEmailDataHidden && (
            <Button
              className="absolute right-6 translate-x-10 opacity-0 transition-all duration-300 group-hover/datalist:translate-x-0 group-hover/datalist:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100"
              size="sm"
              variant="outline"
              onClick={() => {
                navigate(`/posts/analytics/${postId}/newsletter`);
              }}
            >
              View more
            </Button>
          )}
        </div>
        {isNewsletterStatsLoading ? (
          <CardContent>
            <div className="mx-auto flex min-h-[250px] items-center justify-center xl:size-full">
              <BarChartLoadingIndicator />
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <PendingSendEmpty
              className={`${fullWidth && 'grid grid-cols-2'}`}
              description={
                isSendingGated
                  ? 'Opens, clicks and delivery data will appear once every email has been sent'
                  : "Once the first opens and clicks are recorded, they'll show here"
              }
              title={
                isSendingGated ? 'This newsletter is still sending' : 'No newsletter data available'
              }
            >
              <div className={`${fullWidth && 'border-r pr-6'}`}>
                <div className="grid grid-cols-2 gap-6">
                  <KpiCardHeader className="group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0">
                    <div className="flex grow flex-col gap-1.5 border-none pb-0">
                      <KpiCardHeaderLabel color="var(--chart-blue)">
                        Open rate
                        {countedThrough && <Badge variant="secondary">{countedThrough}</Badge>}
                      </KpiCardHeaderLabel>
                      <KpiCardHeaderValue
                        // diffDirection={'up'}
                        // diffTooltip={'Better than the average'}
                        // diffValue={1.45}
                        value={formatPercentage(stats.openedRate)}
                      />
                    </div>
                  </KpiCardHeader>
                  <KpiCardHeader className="group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0">
                    <div className="flex grow flex-col gap-1.5 border-none pb-0">
                      <KpiCardHeaderLabel color="var(--chart-teal)">Click rate</KpiCardHeaderLabel>
                      <KpiCardHeaderValue
                        // diffDirection={'up'}
                        // diffTooltip={'Better than the average'}
                        // diffValue={1.45}
                        value={formatPercentage(stats.clickedRate)}
                      />
                    </div>
                  </KpiCardHeader>
                </div>
                {!fullWidth && <Separator />}
                <div className="mx-auto my-6 h-[240px]">
                  <NewsletterRadialChart
                    className="pointer-events-none aspect-square h-[240px]"
                    config={commonChartConfig}
                    data={commonChartData}
                    tooltip={false}
                  />
                </div>
              </div>

              <div className={`${fullWidth && 'pl-6'}`}>
                {!fullWidth && <Separator />}
                <div className={fullWidth ? '' : 'pt-3'}>
                  <div
                    className={`flex items-center justify-between gap-3 ${fullWidth ? 'pb-3' : 'py-3'}`}
                  >
                    <span className="font-medium text-muted-foreground">
                      Top clicked links in this email
                    </span>
                    <HTable>Members</HTable>
                  </div>

                  {topLinks.length > 0 ? (
                    <DataList className="">
                      <DataListBody>
                        {topLinks.slice(0, fullWidth ? 10 : 5).map((link) => {
                          const percentage = stats.clicked > 0 ? link.count / stats.clicked : 0;
                          return (
                            <DataListRow key={link.link.link_id}>
                              <DataListBar
                                style={{
                                  width: `${percentage ? Math.round(percentage * 100) : 0}%`,
                                }}
                              />
                              <DataListItemContent>
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <LucideIcon.Link
                                    className="shrink-0 text-muted-foreground"
                                    size={16}
                                    strokeWidth={1.5}
                                  />
                                  <a
                                    className="block truncate font-medium hover:underline"
                                    href={link.link.to}
                                    rel="noreferrer"
                                    target="_blank"
                                    title={link.link.to}
                                  >
                                    {cleanTrackedUrl(link.link.to, true)}
                                  </a>
                                </div>
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
                </div>
              </div>
            </PendingSendEmpty>
            {/* <Button variant='outline' onClick={() => {
                        navigate(`/posts/analytics/${postId}/newsletter`);
                    }}>
                        View all
                        <LucideIcon.ArrowRight />
                    </Button> */}
          </CardContent>
        )}
      </Card>
    </>
  );
};

export default NewsletterOverview;
