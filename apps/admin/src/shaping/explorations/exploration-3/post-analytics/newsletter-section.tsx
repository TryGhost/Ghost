import '@/shaping/explorations/exploration-1/web-traffic.css';
import React, { useMemo } from 'react';
import PendingSendEmpty from '@/posts/analytics/email-sending-status/pending-send-empty';
import {
  BarChartLoadingIndicator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type ChartConfig,
  DataList,
  DataListBody,
  DataListItemContent,
  DataListItemValue,
  DataListItemValueAbs,
  DataListItemValuePerc,
  DataListRow,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import {
  NewsletterRadialChart,
  type NewsletterRadialChartData,
} from '@/posts/analytics/newsletter/components/newsletter-radial-chart';
import { type Post } from '@tryghost/admin-x-framework/api/posts';
import { CAPS_LABEL } from '@/shaping/explorations/exploration-1/type';
import { Section, Stat } from './section';
import { ViewAllButton } from '@/shaping/explorations/exploration-1/visitors-header';
import { cleanTrackedUrl } from '@/posts/analytics/utils/link-helpers';
import { useEmailSendingStatusContext } from '@/posts/analytics/email-sending-status/email-sending-status-context';
import { usePostTopLinks } from '@/posts/analytics/hooks/use-post-top-links';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Post analytics' Newsletter performance (posts/analytics/overview/
// components/newsletter-overview.tsx) as an open section: the two rates
// beside the radial chart, then the top clicked links.

const chartConfig = {
  percentage: { label: 'Opened' },
  Average: { label: 'Clicked' },
  'This newsletter': { label: 'Opened' },
} satisfies ChartConfig;

interface NewsletterSectionProps {
  postId: string;
  post: Post;
  isLoading: boolean;
}

const NewsletterSection: React.FC<NewsletterSectionProps> = ({ postId, post, isLoading }) => {
  const { isNewsletterDataHidden } = useEmailSendingStatusContext();
  const { topLinks } = usePostTopLinks();

  const stats = useMemo(() => {
    const opened = post.email?.opened_count || 0;
    const sent = post.email?.email_count || 0;
    const clicked = post.count?.clicks || 0;
    return {
      sent,
      clicked,
      openedRate: sent > 0 ? opened / sent : 0,
      clickedRate: sent > 0 ? clicked / sent : 0,
    };
  }, [post]);

  const chartData: NewsletterRadialChartData[] = [
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

  return (
    <Section
      href={isNewsletterDataHidden ? undefined : `#/posts/analytics/${postId}/newsletter`}
      id="post-newsletter-heading"
      testId="newsletter-performance"
      title="Newsletter performance"
    >
      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <BarChartLoadingIndicator />
        </div>
      ) : (
        <PendingSendEmpty
          description="You'll see opens and clicks here once it finishes"
          title="Your newsletter is being sent"
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-1">
                <Stat label="Sent">{formatNumber(stats.sent)}</Stat>
                <Stat label="Open rate">{formatPercentage(stats.openedRate)}</Stat>
                <Stat label="Click rate">{formatPercentage(stats.clickedRate)}</Stat>
              </div>
              <div className="mx-auto h-[240px] md:mx-0">
                <NewsletterRadialChart
                  className="pointer-events-none aspect-square h-[240px]"
                  config={chartConfig}
                  data={chartData}
                  tooltip={false}
                />
              </div>
            </div>

            {/* Built like Web traffic's Breakdown lists (exploration-1/
                sources-card.tsx), opened up by web-traffic.css under
                .web-open-layout: a 17px title with the up-right "View all"
                arrow (the Newsletter tab), "Members" at the right, then the
                rows, with no bars; the percentage slides in on hover */}
            <div className="web-open-layout">
              <Card className="group/datalist" data-testid="top-links-card">
                <div className="flex items-center justify-between gap-6 px-6 pt-6 pb-5">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-1">
                      <CardTitle>Top clicked links in this email</CardTitle>
                      {topLinks.length > 0 && (
                        <ViewAllButton
                          onClick={() => {
                            window.location.hash = `#/posts/analytics/${postId}/newsletter`;
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <div className={CAPS_LABEL}>Members</div>
                </div>
                <CardContent className="overflow-hidden">
                  {topLinks.length > 0 ? (
                    <DataList>
                      <DataListBody>
                        {topLinks.slice(0, 5).map((link) => {
                          const percentage =
                            stats.clicked > 0 ? Math.min(link.count / stats.clicked, 1) : 0;
                          return (
                            <DataListRow key={link.link.link_id} className="group/row">
                              <DataListItemContent className="group-hover/datalist:max-w-[calc(100%-140px)]">
                                <a
                                  className="group/link flex min-w-0 items-center gap-2"
                                  href={link.link.to}
                                  rel="noreferrer"
                                  target="_blank"
                                  title={link.link.to}
                                >
                                  <LucideIcon.Link
                                    className="shrink-0 text-muted-foreground"
                                    size={16}
                                    strokeWidth={1.5}
                                  />
                                  <span className="truncate group-hover/link:underline">
                                    {cleanTrackedUrl(link.link.to, true)}
                                  </span>
                                </a>
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
                    <p className="py-10 text-center text-base text-muted-foreground italic">
                      You have no links in your post.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </PendingSendEmpty>
      )}
    </Section>
  );
};

export default NewsletterSection;
