import {
  BarChartLoadingIndicator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
} from '@tryghost/shade/components';
import {
  GhAreaChart,
  KpiDropdownButton,
  KpiTabTrigger,
  KpiTabValue,
} from '@tryghost/shade/patterns';
import { KPI_METRICS } from '@/analytics/views/stats/web/web-kpi-metrics';
import {
  calculateYAxisWidth,
  formatDuration,
  formatNumber,
  formatPercentage,
  getYRange,
} from '@tryghost/shade/utils';
import { getEffectiveChartRange, sanitizeChartData } from '@/shared/analytics/chart-helpers';
import { useMemo, useState } from 'react';
import type { KpiDataItem } from '@/analytics/views/stats/web/components/web-kpis';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Web traffic tabs and chart: a copy of
// analytics/views/stats/web/components/web-kpis.tsx, lined up on the page's
// content edge (web-traffic.css):
//
// - The tab row no longer bleeds past the edge, so its rule and the active
//   tab's underline start where the title does
// - Each tab's colour dot follows its label instead of leading it
// - The chart's plot starts on the edge, with the y-axis numbers over it

interface WebKPIsProps {
  data: KpiDataItem[] | null;
  range: number;
  isLoading: boolean;
}

// Where GhAreaChart's plot starts: its 4px margin plus the y-axis width.
// Mirrors GhAreaChart's own ticks so it fits any range. The chart is pulled
// left by this much so the plot starts on the content edge, and the y-axis
// numbers sit over the plot (web-traffic.css).
const plotStart = (max: number) => {
  const mid = max / 2;
  const ticks = Number.isInteger(mid) ? [0, mid, max] : [0, max];
  return 4 + calculateYAxisWidth(ticks, formatNumber);
};

const WebKPIs: React.FC<WebKPIsProps> = ({ data, range, isLoading }) => {
  const [currentTab, setCurrentTab] = useState('visits');
  const currentMetric = KPI_METRICS[currentTab];

  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    return (
      sanitizeChartData<KpiDataItem>(
        data,
        range,
        currentMetric.dataKey as keyof KpiDataItem,
        'sum',
      )?.map((item: KpiDataItem) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
          date: String(item.date),
          value,
          formattedValue: currentMetric.formatter(value),
          label: currentMetric.label,
        };
      }) || []
    );
  }, [data, range, currentMetric]);

  const chartRange = useMemo(() => {
    return getEffectiveChartRange(range, data || [], {
      fieldName: currentMetric.dataKey as keyof KpiDataItem,
    });
  }, [data, range, currentMetric]);

  const yMax = getYRange(chartData).max;

  const getKpiValues = () => {
    if (!data?.length) {
      return { visits: 0, views: 0, bounceRate: 0, duration: 0 };
    }

    const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
    const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);

    const _ponderatedKPIsTotal = (kpi: keyof (typeof data)[0]) => {
      return data.reduce((prev, curr) => {
        const currValue = Number(curr[kpi] ?? 0);
        const currVisits = Number(curr.visits);
        return prev + (currValue * currVisits) / totalVisits;
      }, 0);
    };

    return {
      visits: formatNumber(totalVisits),
      views: formatNumber(totalViews),
      bounceRate: formatPercentage(_ponderatedKPIsTotal('bounce_rate')),
      duration: formatDuration(_ponderatedKPIsTotal('avg_session_sec')),
    };
  };

  const kpiValues = getKpiValues();

  if (isLoading) {
    return (
      <div className="-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center">
        <BarChartLoadingIndicator />
      </div>
    );
  }

  return (
    <Tabs className="web-open-kpis" data-testid="web-graph" defaultValue="visits" variant="kpis">
      <TabsList className="hidden grid-cols-2 md:visible! md:grid!">
        <KpiTabTrigger
          style={{ '--dot': 'var(--chart-blue)' } as React.CSSProperties}
          value="visits"
          onClick={() => setCurrentTab('visits')}
        >
          <KpiTabValue label="Unique visitors" value={kpiValues.visits} />
        </KpiTabTrigger>
        <KpiTabTrigger
          style={{ '--dot': 'var(--chart-teal)' } as React.CSSProperties}
          value="views"
          onClick={() => setCurrentTab('views')}
        >
          <KpiTabValue label="Total views" value={kpiValues.views} />
        </KpiTabTrigger>
      </TabsList>
      <DropdownMenu>
        <DropdownMenuTrigger className="md:hidden" asChild>
          <KpiDropdownButton>
            {currentTab === 'visits' && (
              <KpiTabValue label="Unique visitors" value={kpiValues.visits} />
            )}
            {currentTab === 'views' && <KpiTabValue label="Total views" value={kpiValues.views} />}
          </KpiDropdownButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setCurrentTab('visits')}>
            Unique visitors
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCurrentTab('views')}>Total views</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div
        className="web-open-chart my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500"
        style={{ '--plot-start': `${plotStart(yMax)}px` } as React.CSSProperties}
      >
        <GhAreaChart
          className="-mb-3 h-[16vw] max-h-[320px] min-h-[180px] w-full"
          color={currentMetric.color}
          data={chartData}
          id="mrr"
          range={chartRange}
          showHours={true}
          yAxisRange={[0, yMax]}
        />
      </div>
    </Tabs>
  );
};

export default WebKPIs;
