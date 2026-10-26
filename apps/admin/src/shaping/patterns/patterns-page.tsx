import DateRangeSelect from '@/analytics/views/stats/components/date-range-select';
import GrowthKPIs from '@/analytics/views/stats/growth/components/growth-kpis';
import LatestPost from '@/analytics/views/stats/overview/components/latest-post';
import LocationsCard from '@/analytics/views/stats/locations/components/locations-card';
import NewsletterKPIs from '@/analytics/views/stats/newsletters/components/newsletters-kpis';
import OverviewKPIs from '@/analytics/views/stats/overview/components/overview-kpis';
import PaidMembersChangeChart from '@/analytics/views/stats/growth/components/paid-subscription-change-chart';
import React, { useMemo } from 'react';
import SourcesCard from '@/analytics/views/stats/web/components/sources-card';
import StatsHeader from '@/analytics/views/stats/layout/stats-header';
import StatsLayout from '@/analytics/views/stats/layout/stats-layout';
import StatsView from '@/analytics/views/stats/layout/stats-view';
import TopPosts from '@/analytics/views/stats/overview/components/top-posts';
import WebKPIs from '@/analytics/views/stats/web/components/web-kpis';
import WebOverview from '@/posts/analytics/overview/components/web-overview';
import {
  Badge,
  Card,
  CardContent,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  NavbarActions,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { HelpCard } from '@/analytics/views/stats/overview/overview';
import { LucideIcon } from '@tryghost/shade/utils';
import { NewsletterRadialChart } from '@/posts/analytics/newsletter/components/newsletter-radial-chart';
import {
  PostAnalyticsContext,
  type PostAnalyticsContextType,
} from '@/posts/analytics/providers/post-analytics-context';
import { SLICES, type SliceStatus, TO_CONSIDER } from './release-plan';
import { CURRENCY, buildFixtures, radialConfig } from './fixtures';
import { patternsScenario, useScenario } from '@/shaping/data/scenario';
import { useAnalytics } from '@/analytics/providers/analytics-context';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Every building block the Analytics screens are made of, on one page, so they
// can be designed together. Each block is the real component the screens
// render, fed sample data (fixtures.ts) instead of a query: change a component
// and this page and the real screens change with it. The data follows the
// prototype menu's scenario and the header's date range.

// The post screens read their post from PostAnalyticsContext. The cards shown
// here only ask whether it has loaded, so no post is needed.
const postContextFor = (range: number): PostAnalyticsContextType => ({
  postId: 'pattern-post',
  post: undefined,
  isPostLoading: false,
  refetchPost: async () => {},
  range,
  setRange: () => {},
});

const STATUS: Record<SliceStatus, { label: string; variant: 'success' | 'warning' | 'outline' }> = {
  built: { label: 'Built in prototype', variant: 'success' },
  'on-hold': { label: 'On hold', variant: 'warning' },
  'to-do': { label: 'To do', variant: 'outline' },
};

interface PatternProps {
  title: string;
  usedOn: string;
  source: string;
  children: React.ReactNode;
}

// A quiet one-line label ("STAT CARDS"); where it's used and which files it
// lives in show on hover, or on keyboard focus. Light SF Mono where there is
// one: Ghost's mono stack (Menlo on a Mac) has no light weight. Generous space
// between sections; the first sits close under the header.
const Pattern: React.FC<PatternProps> = ({ title, usedOn, source, children }) => (
  <section className="flex flex-col gap-4 pt-4 [section+&]:pt-24">
    <h2>
      <HoverCard closeDelay={100} openDelay={150}>
        <HoverCardTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 rounded-xs [font-family:ui-monospace,var(--font-mono)] text-md font-light tracking-wide text-gray-500 uppercase outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-text-secondary"
            type="button"
          >
            <span>{title}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-auto max-w-md">
          <Stack gap="xs">
            <Text size="sm">Used on {usedOn}</Text>
            <Text className="font-mono" size="xs" tone="tertiary">
              {source}
            </Text>
          </Stack>
        </HoverCardContent>
      </HoverCard>
    </h2>
    {children}
  </section>
);

const Variant: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack gap="sm">
    <Text size="xs" tone="tertiary" weight="medium">
      {label}
    </Text>
    {children}
  </Stack>
);

const PatternsPage: React.FC = () => {
  const scenario = patternsScenario(useScenario());
  const { range: RANGE } = useAnalytics();
  const fixtures = useMemo(() => buildFixtures(scenario, RANGE), [scenario, RANGE]);
  const patternPostContext = useMemo(() => postContextFor(RANGE), [RANGE]);
  const {
    clickedRadial,
    growthChart,
    growthTotals,
    latestPost,
    locations,
    membersChart,
    mrrChart,
    newsletterSends,
    newsletterTotals,
    openedRadial,
    paidSubscriptionChanges,
    postSources,
    postVisitors,
    postVisitorsChart,
    radialLabels,
    sentRadial,
    sources,
    subscribers,
    topPosts,
    totalVisitors,
    visitorsChart,
    webKpis,
  } = fixtures;

  return (
    <StatsLayout>
      <StatsHeader>
        <NavbarActions>
          <DateRangeSelect excludeRanges={['today']} />
        </NavbarActions>
      </StatsHeader>
      <StatsView isLoading={false}>
        <Pattern
          source="analytics/views/stats/overview/components/overview-kpis.tsx"
          title="Stat cards"
          usedOn="Overview"
        >
          <OverviewKPIs
            currencySymbol={CURRENCY}
            growthChartRange={RANGE}
            growthTotals={growthTotals}
            isLoading={false}
            kpiValues={{ visits: totalVisitors.toLocaleString('en-US') }}
            membersChartData={membersChart}
            mrrChartData={mrrChart}
            visitorsChartData={visitorsChart}
            visitorsChartRange={RANGE}
            visitorsYRange={[0, Math.max(...visitorsChart.map((item) => item.value))]}
          />
        </Pattern>

        <Pattern
          source="web/components/web-kpis.tsx · growth/components/growth-kpis.tsx · newsletters/components/newsletters-kpis.tsx"
          title="Metric tabs with a chart"
          usedOn="Web traffic, Growth, Newsletters, post Web traffic"
        >
          {/* Each wrapped in a Card the way its screen does (web.tsx,
              growth.tsx, newsletters.tsx) */}
          <Variant label="Two metrics (Web traffic)">
            <Card>
              <CardContent>
                <WebKPIs data={webKpis} isLoading={false} range={RANGE} />
              </CardContent>
            </Card>
          </Variant>
          <Variant label="Four metrics (Growth)">
            <Card>
              <CardContent>
                <GrowthKPIs
                  chartData={growthChart}
                  currencySymbol={CURRENCY}
                  isLoading={false}
                  totals={growthTotals}
                />
              </CardContent>
            </Card>
          </Variant>
          <Variant label="Three metrics, bar chart for rates (Newsletters)">
            <Card>
              <CardContent>
                <NewsletterKPIs
                  avgsData={newsletterSends}
                  isAvgsLoading={false}
                  isLoading={false}
                  subscribersData={subscribers}
                  totals={newsletterTotals}
                />
              </CardContent>
            </Card>
          </Variant>
        </Pattern>

        <Pattern
          source="overview/components/latest-post.tsx · overview/components/top-posts.tsx"
          title="Posts"
          usedOn="Overview"
        >
          <Variant label="Latest post">
            <LatestPost isLoading={false} latestPostStats={latestPost} />
          </Variant>
          <Variant label="Top posts">
            <TopPosts isLoading={false} topPostsData={topPosts} />
          </Variant>
        </Pattern>

        <Pattern
          source="web/components/sources-card.tsx · locations/components/locations-card.tsx"
          title="Ranked lists"
          usedOn="Web traffic, post Web traffic, post Overview"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SourcesCard
              data={sources}
              isLoading={false}
              range={RANGE}
              totalVisitors={totalVisitors}
            />
            <LocationsCard data={locations} isLoading={false} range={RANGE} />
          </div>
        </Pattern>

        <Pattern
          source="growth/components/paid-subscription-change-chart.tsx · posts/analytics/newsletter/components/newsletter-radial-chart.tsx"
          title="Other charts"
          usedOn="Growth (bars), post Newsletter (rings)"
        >
          <Variant label="Bars: new and cancelled paid subscriptions">
            <PaidMembersChangeChart
              isLoading={false}
              memberData={paidSubscriptionChanges}
              range={RANGE}
            />
          </Variant>
          <Variant label="Rings: sent, opened and clicked for one newsletter">
            <Card>
              <CardContent className="grid grid-cols-1 gap-6 py-6 md:grid-cols-3">
                <NewsletterRadialChart
                  config={radialConfig('Sent')}
                  data={sentRadial}
                  percentageLabel="Sent"
                  percentageValue={radialLabels.sent}
                  tooltip={false}
                />
                <NewsletterRadialChart
                  config={radialConfig('Opened')}
                  data={openedRadial}
                  percentageLabel="Open rate"
                  percentageValue={radialLabels.opened}
                />
                <NewsletterRadialChart
                  config={radialConfig('Clicked')}
                  data={clickedRadial}
                  percentageLabel="Click rate"
                  percentageValue={radialLabels.clicked}
                />
              </CardContent>
            </Card>
          </Variant>
        </Pattern>

        <Pattern
          source="posts/analytics/overview/components/web-overview.tsx"
          title="Post analytics cards"
          usedOn="post Overview"
        >
          {/* Post screens sit inside a post's analytics; stand in for it */}
          <PostAnalyticsContext.Provider value={patternPostContext}>
            <WebOverview
              chartData={postVisitorsChart}
              isLoading={false}
              range={RANGE}
              sourcesData={postSources}
              visitors={postVisitors}
            />
          </PostAnalyticsContext.Provider>
        </Pattern>

        <Pattern
          source="the same components, with no data"
          title="Empty states"
          usedOn="every screen, on a quiet site"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Variant label="Ranked list, no sources">
              <SourcesCard data={[]} isLoading={false} range={RANGE} totalVisitors={0} />
            </Variant>
            <Variant label="Ranked list, no locations">
              <LocationsCard data={[]} isLoading={false} range={RANGE} />
            </Variant>
          </div>
          <Variant label="Top posts, none yet">
            <TopPosts isLoading={false} topPostsData={{ stats: [] }} />
          </Variant>
          <Variant label="Metric tabs, no visitors">
            <Card>
              <CardContent>
                <WebKPIs data={[]} isLoading={false} range={RANGE} />
              </CardContent>
            </Card>
          </Variant>
        </Pattern>

        <Pattern
          source="analytics/views/stats/overview/overview.tsx (HelpCard)"
          title="Banner"
          usedOn="Overview"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HelpCard
              description="Find out how to review the performance of your content and get the most out of post analytics in Ghost."
              title="Understanding analytics in Ghost"
              url="https://ghost.org/help/native-analytics"
            >
              <div className="flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tr from-[#14B8FF]/20 to-[#00BBA7]/20 p-4">
                <LucideIcon.ChartColumnIncreasing
                  className="text-[#00BBA7]"
                  size={20}
                  strokeWidth={1.5}
                />
              </div>
            </HelpCard>
            <HelpCard
              description="Use these content distribution tactics to get more people to discover your work and increase engagement."
              title="How to get your content seen online"
              url="https://ghost.org/resources/content-distribution/"
            >
              <div className="flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tl from-[#FDC700]/20 to-[#FF2056]/20 p-4">
                <LucideIcon.Globe className="text-[#FE9A00]" size={20} strokeWidth={1.5} />
              </div>
            </HelpCard>
          </div>
        </Pattern>

        <Pattern
          source="these fetch their own data, so they need fake responses first"
          title="Not on this page yet"
          usedOn="Web traffic, Growth, Newsletters, post Newsletter"
        >
          <Stack gap="xs">
            {[
              'Top content (Posts & pages / Posts / Pages tabs), Web traffic',
              'Top sources and Top content by growth, Growth',
              'Paid subscription breakdown (donut), Growth',
              'Top newsletters table, Newsletters',
              'Newsletter clicks and Feedback, post Newsletter',
              'Filter bar and newsletter picker, header',
            ].map((item) => (
              <Text key={item} size="sm" tone="secondary">
                · {item}
              </Text>
            ))}
          </Stack>
        </Pattern>

        <Pattern
          source="shaping/patterns/release-plan.ts"
          title="Release plan"
          usedOn="the Admin 7 analytics update, in shipping order"
        >
          <Stack className="max-w-3xl" gap="xl">
            {SLICES.map((slice, index) => (
              <Stack key={slice.title} gap="sm">
                <Inline align="center" gap="sm">
                  <Text className="font-mono" size="sm" tone="tertiary">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text size="md" weight="semibold">
                    {slice.title}
                  </Text>
                  <Badge size="sm" variant={STATUS[slice.status].variant}>
                    {STATUS[slice.status].label}
                  </Badge>
                </Inline>
                <Text size="sm">{slice.summary}</Text>
                <Stack gap="xs">
                  <Text size="sm" tone="secondary">
                    Reach: {slice.reach}
                  </Text>
                  {slice.dependsOn && (
                    <Text size="sm" tone="secondary">
                      Depends on: {slice.dependsOn.join(', ')}
                    </Text>
                  )}
                  {slice.notes?.map((note) => (
                    <Text key={note} size="sm" tone="secondary">
                      · {note}
                    </Text>
                  ))}
                  {slice.commits && (
                    <Text className="font-mono" size="xs" tone="tertiary">
                      {slice.commits.join(' · ')}
                    </Text>
                  )}
                </Stack>
              </Stack>
            ))}
            <Stack gap="sm">
              <Text size="md" weight="semibold">
                Still to consider
              </Text>
              <Stack gap="xs">
                {TO_CONSIDER.map((item) => (
                  <Text key={item} size="sm" tone="secondary">
                    · {item}
                  </Text>
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Pattern>
      </StatsView>
    </StatsLayout>
  );
};

export default PatternsPage;
