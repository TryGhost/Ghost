import React from 'react';
import {
  BarChartLoadingIndicator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyCard,
  EmptyIndicator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import {
  GhAreaChart,
  type GhAreaChartDataItem,
  KpiCardHeaderLabel,
  KpiCardHeaderValue,
} from '@tryghost/shade/patterns';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { getPeriodText, centsToDollars } from '@/shared/analytics/chart-helpers';
import {
  usePaidMembersEnabled,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { upgradeRoute } from '@tryghost/admin-x-framework/api/config';
import { useHostLimits } from '@tryghost/admin-x-framework/hooks';
import { useNavigate } from '@tryghost/admin-x-framework';
import { navigateTo } from '@/utils/navigation';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Overview stat cards: a copy of
// analytics/views/stats/overview/components/overview-kpis.tsx with only the
// Admin 7 card, whose "View more" is a hover arrow after the label.

interface OverviewKPICardProps {
  linkto: string;
  title: string;
  iconName?: keyof typeof LucideIcon;
  description: string;
  diffDirection?: 'up' | 'down' | 'same' | 'empty';
  diffValue?: string;
  color?: string;
  formattedValue: string;
  trendingFromValue?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

// The trend badge's tooltip, shared by both stat cards
const useDiffTooltip = ({
  diffDirection,
  diffValue,
  formattedValue,
  trendingFromValue,
}: Pick<
  OverviewKPICardProps,
  'diffDirection' | 'diffValue' | 'formattedValue' | 'trendingFromValue'
>) => {
  const { range } = useAnalytics();

  // Construct tooltip message based on input parameters
  return React.useMemo(() => {
    if (
      !diffDirection ||
      diffDirection === 'empty' ||
      range === STATS_RANGES.allTime.value ||
      !diffValue
    ) {
      return '';
    }

    const directionText = diffDirection === 'up' ? 'up' : diffDirection === 'down' ? 'down' : 'at';

    // Get period text and clean it up for tooltip
    const periodText = getPeriodText(range);
    const timeRangeText = periodText
      .replace('in the ', '') // Remove "in the " prefix
      .replace(/^\(|\)$/g, ''); // Remove parentheses for "(all time)"

    if (diffDirection === 'same') {
      return (
        <span>
          You&apos;re trending at the same level as{' '}
          <span className="font-semibold">{formattedValue}</span> compared to the{' '}
          <span className="font-semibold">{timeRangeText}</span>
        </span>
      );
    }

    return (
      <span>
        You&apos;re trending{' '}
        <span className="font-semibold">
          {directionText} {diffValue}
        </span>{' '}
        from <span className="font-semibold">{trendingFromValue}</span> compared to the{' '}
        {timeRangeText}
      </span>
    );
  }, [diffDirection, diffValue, trendingFromValue, formattedValue, range]);
};

// EXPLORATION: the trend under the number, with the value it's measured from
// beside it: "▲ 3%  from 20,800". The caret and colours match Exploration 1's
// trends elsewhere (exploration.css restyles Shade's TrendBadge, which isn't
// exported, so it's drawn here). The tooltip still explains it on hover. A
// card with no trend (Unique visitors) keeps the row's height, so the
// numbers and charts line up across the row.
const TrendRow: React.FC<{
  diffDirection?: OverviewKPICardProps['diffDirection'];
  diffValue?: string;
  trendingFromValue?: string;
  diffTooltip: React.ReactNode;
}> = ({ diffDirection, diffValue, trendingFromValue, diffTooltip }) => {
  if (!diffDirection || diffDirection === 'empty' || !diffValue) {
    return <div aria-hidden="true" className="h-[22px]" />;
  }

  const row = (
    <div className="flex h-[22px] cursor-default items-center gap-2 self-start text-sm">
      <span
        className={cn(
          'flex items-center gap-1 font-medium',
          diffDirection === 'up' && 'text-green-600',
          diffDirection === 'down' && 'text-state-danger',
          diffDirection === 'same' && 'text-muted-foreground',
        )}
      >
        {diffDirection !== 'same' && (
          <span
            aria-hidden="true"
            className={cn(
              'h-[5px] w-2 bg-current',
              diffDirection === 'up'
                ? '[clip-path:polygon(50%_0,100%_100%,0_100%)]'
                : '[clip-path:polygon(0_0,100%_0,50%_100%)]',
            )}
          />
        )}
        {diffValue}
      </span>
      {trendingFromValue && <span className="text-muted-foreground">from {trendingFromValue}</span>}
    </div>
  );

  if (!diffTooltip) {
    return row;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent className="max-w-[240px] bg-background text-sm text-pretty text-foreground shadow-md dark:bg-popover">
          {diffTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// EXPLORATION: Planned's Admin 7 stat card (open columns, with no rule between
// the number and the chart), with "View more" replaced by Top posts' hover
// arrow: hovering the card raises a right arrow after the label, through a
// mask, and turns the label default colour. The label and number are the
// link.
const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
  title,
  diffDirection,
  diffValue,
  formattedValue,
  trendingFromValue,
  children,
  onClick,
}) => {
  const { range } = useAnalytics();
  const diffTooltip = useDiffTooltip({
    diffDirection,
    diffValue,
    formattedValue,
    trendingFromValue,
  });

  return (
    <div className="group/kpi flex flex-col" data-testid={title}>
      <div className="flex items-start justify-between gap-5">
        <div
          className={cn('flex flex-col gap-2', onClick && 'cursor-pointer')}
          role={onClick ? 'link' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onClick={onClick}
          onKeyDown={(event) => {
            if (onClick && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              onClick();
            }
          }}
        >
          <div className="flex items-center gap-1.5">
            <KpiCardHeaderLabel
              className={
                onClick &&
                'transition-colors group-focus-within/kpi:text-foreground group-hover/kpi:text-foreground'
              }
            >
              {title}
            </KpiCardHeaderLabel>
            {/* Outside the label: Planned's label style hides icons in it */}
            {onClick && (
              <span aria-hidden="true" className="flex size-4 shrink-0 overflow-hidden">
                <LucideIcon.ArrowRight className="size-4 translate-y-full stroke-[1.5px] text-foreground transition-transform duration-200 ease-out group-focus-within/kpi:translate-y-0 group-hover/kpi:translate-y-0 motion-reduce:transition-none" />
              </span>
            )}
          </div>
          <KpiCardHeaderValue diffDirection="hidden" value={formattedValue} />
          {range !== STATS_RANGES.allTime.value && (
            <TrendRow
              diffDirection={diffDirection}
              diffTooltip={diffTooltip}
              diffValue={diffValue}
              trendingFromValue={trendingFromValue}
            />
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};

interface OverviewKPIsProps {
  kpiValues: { visits: string };
  visitorsChartData: GhAreaChartDataItem[];
  visitorsChartRange: number;
  visitorsYRange: [number, number];
  growthTotals: {
    directions: { total: 'up' | 'down' | 'same' | 'empty'; mrr: 'up' | 'down' | 'same' | 'empty' };
    percentChanges: { total: string; mrr: string };
    totalMembers: number;
    mrr: number;
  };
  membersChartData: GhAreaChartDataItem[];
  mrrChartData: GhAreaChartDataItem[];
  growthChartRange: number;
  currencySymbol: string;
  isLoading: boolean;
}

const OverviewKPIs: React.FC<OverviewKPIsProps> = ({
  kpiValues,
  visitorsChartData,
  visitorsChartRange,
  visitorsYRange,
  growthTotals,
  membersChartData,
  mrrChartData,
  growthChartRange,
  currencySymbol,
  isLoading,
}) => {
  const navigate = useNavigate();
  const webAnalyticsEnabled = useWebAnalyticsEnabled();
  const paidMembersEnabled = usePaidMembersEnabled();
  const hostLimits = useHostLimits();
  const { config } = useAnalyticsData();
  const isWebAnalyticsLimited = hostLimits?.limitAnalytics?.disabled === true;

  // EXPLORATION: a little shorter than today's (10vw, 100–200px), and right
  // under the number, so the two read as one
  const areaChartClassName = '-mb-3 h-[8vw] max-h-[160px] min-h-[96px] hover:cursor-pointer!';

  if (isLoading) {
    return (
      <EmptyCard className="flex h-[calc(10vw+116px)] max-h-[416px] min-h-20 items-center justify-center hover:cursor-pointer!">
        <BarChartLoadingIndicator />
      </EmptyCard>
    );
  }

  // Calculate number of cards being displayed
  const showWebAnalytics = webAnalyticsEnabled;
  const showUpgradeCTA = isWebAnalyticsLimited && !showWebAnalytics;
  const showMembers = true; // Always shown
  const showMRR = paidMembersEnabled;

  // Determine number of columns to display, 1, 2, or 3
  const cardCount = [showWebAnalytics, showUpgradeCTA, showMembers, showMRR].filter(Boolean).length;
  let cols = 'lg:grid-cols-3';
  if (cardCount === 2) {
    cols = 'lg:grid-cols-2';
  } else if (cardCount === 1) {
    cols = 'lg:grid-cols-1';
  }
  // ANALYTICS PROTOTYPE: open columns need more room between them than cards
  const containerClass = `flex flex-col lg:grid ${cols} gap-6 admin7-analytics:gap-10`;

  return (
    // SHAPING PROTOTYPE ONLY: data-overview-kpis is a hook for explorations' CSS
    <div className={containerClass} data-overview-kpis>
      {showWebAnalytics && !showUpgradeCTA && (
        <OverviewKPICard
          description="Number of individual people who visited your website"
          diffDirection="empty"
          formattedValue={kpiValues.visits}
          iconName="Globe"
          linkto="/analytics/web/"
          title="Unique visitors"
          onClick={() => {
            navigate('/analytics/web/');
          }}
        >
          <GhAreaChart
            className={areaChartClassName}
            color="var(--chart-blue)"
            data={visitorsChartData}
            id="visitors"
            range={visitorsChartRange}
            showHorizontalLines={true}
            showYAxisValues={false}
            syncId="overview-charts"
            yAxisRange={visitorsYRange}
          />
        </OverviewKPICard>
      )}

      {showUpgradeCTA && (
        <Card>
          <CardHeader className="hidden">
            <CardTitle>Unlock web analytics</CardTitle>
            <CardDescription>
              Get the full picture of what&apos;s working with detailed, cookie-free traffic
              analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full items-center justify-center p-6">
            <EmptyIndicator
              actions={
                <Button variant="outline" onClick={() => navigateTo(upgradeRoute(config))}>
                  Upgrade now
                </Button>
              }
              className="py-10"
              description={`Get the full picture of what's working with detailed, cookie-free traffic analytics.`}
              title="Unlock web analytics"
            >
              <LucideIcon.ChartSpline />
            </EmptyIndicator>
          </CardContent>
        </Card>
      )}

      {showMembers && (
        <OverviewKPICard
          description="How number of members of your publication changed over time"
          diffDirection={growthTotals.directions.total}
          diffValue={growthTotals.percentChanges.total}
          formattedValue={formatNumber(growthTotals.totalMembers)}
          iconName="User"
          linkto="/analytics/growth/"
          title="Members"
          trendingFromValue={`${formatNumber(membersChartData[0]?.value ?? 0)}`}
          onClick={() => {
            navigate('/analytics/growth/?tab=total-members');
          }}
        >
          <GhAreaChart
            className={areaChartClassName}
            color="var(--chart-darkblue)"
            data={membersChartData}
            id="members"
            range={growthChartRange}
            showHorizontalLines={true}
            showYAxisValues={false}
            syncId="overview-charts"
          />
        </OverviewKPICard>
      )}

      {showMRR && (
        <OverviewKPICard
          description="Monthly recurring revenue changes over time"
          diffDirection={growthTotals.directions.mrr}
          diffValue={growthTotals.percentChanges.mrr}
          formattedValue={`${currencySymbol}${formatNumber(centsToDollars(growthTotals.mrr))}`}
          iconName="Coins"
          linkto="/analytics/growth/"
          title="MRR"
          trendingFromValue={`${currencySymbol}${formatNumber(mrrChartData[0]?.value ?? 0)}`}
          onClick={() => {
            navigate('/analytics/growth/?tab=mrr');
          }}
        >
          <GhAreaChart
            className={areaChartClassName}
            color="var(--chart-teal)"
            data={mrrChartData}
            id="mrr"
            range={growthChartRange}
            showHorizontalLines={true}
            showYAxisValues={false}
            syncId="overview-charts"
          />
        </OverviewKPICard>
      )}
    </div>
  );
};

export default OverviewKPIs;
