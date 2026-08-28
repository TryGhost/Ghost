import React, { useEffect, useMemo, useState } from 'react';
import {
  DELIVERY_PROVIDERS,
  type DeliveryProviderKey,
  deliveryRateForSend,
} from './deliverability-breakdown';
import { type AvgsDataItem } from '@/analytics/views/stats/newsletters/newsletters';
import {
  BarChartLoadingIndicator,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyIndicator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
} from '@tryghost/shade/components';
import {
  GhAreaChart,
  KpiDropdownButton,
  KpiTabTrigger,
  KpiTabValue,
} from '@tryghost/shade/patterns';
import {
  LucideIcon,
  Recharts,
  calculateYAxisWidth,
  formatDisplayDate,
  formatNumber,
  formatPercentage,
} from '@tryghost/shade/utils';
import {
  getEffectiveChartRange,
  getPeriodText,
  sanitizeChartData,
} from '@/shared/analytics/chart-helpers';
import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useEmailTrackClicks, useEmailTrackOpens } from '@tryghost/admin-x-framework/api/settings';
import { useAnalytics } from '@/analytics/providers/analytics-context';

interface BarTooltipPayload {
  value: number;
  payload: AvgsDataItem;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: BarTooltipPayload[];
  range?: number;
}

// Delivery rates live between 98–100%, so whole-percent rounding (which
// turns 99.6% into 100%) hides the signal — keep one decimal unless exact.
const formatDeliveredRate = (rate: number): string => {
  const percentage = rate * 100;
  return Number.isInteger(percentage) ? `${percentage}%` : `${percentage.toFixed(1)}%`;
};

const BarTooltipContent = ({ active, payload }: BarTooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  const currentItem = payload[0].payload as AvgsDataItem & { delivery_rate?: number };
  const sendDate =
    typeof currentItem.send_date === 'string'
      ? currentItem.send_date
      : currentItem.send_date.toISOString().split('T')[0];

  return (
    <div className="max-w-[240px] min-w-[220px] rounded-lg border bg-background px-3 py-2 shadow-lg">
      <div className="mb-2 flex w-full flex-col border-b pb-2">
        <span className="text-sm leading-tight font-semibold">{currentItem.post_title}</span>
        <span className="text-sm text-muted-foreground">Sent on {formatDisplayDate(sendDate)}</span>
      </div>

      <div className="mb-1 flex w-full justify-between">
        <span className="font-medium text-muted-foreground">Sent</span>
        <div className="ml-2 w-full text-right font-mono">{formatNumber(currentItem.sent_to)}</div>
      </div>

      {typeof currentItem.delivery_rate === 'number' && (
        <div className="mb-1 flex w-full justify-between">
          <span className="font-medium text-muted-foreground">Delivered</span>
          <div className="ml-2 w-full text-right font-mono">
            {formatDeliveredRate(currentItem.delivery_rate)}
          </div>
        </div>
      )}

      <div className="mb-1 flex w-full justify-between">
        <span className="font-medium text-muted-foreground">Opens</span>
        <div className="ml-2 w-full text-right font-mono">
          <span className="text-muted-foreground">{formatNumber(currentItem.total_opens)} / </span>
          {formatPercentage(currentItem.open_rate)}
        </div>
      </div>

      <div className="mb-1 flex w-full justify-between">
        <span className="font-medium text-muted-foreground">Clicks</span>
        <div className="ml-2 w-full text-right font-mono">
          <span className="text-muted-foreground">{formatNumber(currentItem.total_clicks)} / </span>
          {formatPercentage(currentItem.click_rate)}
        </div>
      </div>
    </div>
  );
};

type Totals = {
  totalSubscribers: number;
  avgOpenRate: number;
  avgClickRate: number;
};

type SubscribersDataItem = {
  date: string;
  value: number;
};

const NewsletterKPIs: React.FC<{
  subscribersData: SubscribersDataItem[];
  avgsData: AvgsDataItem[];
  totals: Totals;
  isLoading: boolean;
  isAvgsLoading: boolean;
  initialTab?: string;
}> = ({
  subscribersData: allSubscribersData,
  avgsData,
  totals,
  isLoading,
  isAvgsLoading,
  initialTab = 'total-subscribers',
}) => {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const { range } = useAnalytics();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailTrackClicksEnabled = useEmailTrackClicks();
  const emailTrackOpensEnabled = useEmailTrackOpens();

  const { totalSubscribers, avgOpenRate, avgClickRate } = totals;

  // Sanitize subscribers data (API returns cumulative values, not deltas)
  const subscribersData = useMemo(() => {
    if (!allSubscribersData || allSubscribersData.length === 0) {
      return [];
    }

    let sanitizedData: SubscribersDataItem[] = [];

    // First sanitize the data based on range
    // Use 'exact' aggregation type since we have cumulative values
    sanitizedData = sanitizeChartData(allSubscribersData, range, 'value', 'exact');

    const processedData = sanitizedData.map((item) => ({
      ...item,
      formattedValue: formatNumber(item.value),
      label: 'Total Subscribers',
    }));

    return processedData;
  }, [allSubscribersData, range]);

  const chartRange = useMemo(() => {
    return getEffectiveChartRange(range, allSubscribersData || []);
  }, [allSubscribersData, range]);

  const subscribersDiff = useMemo(() => {
    if (!subscribersData || subscribersData.length <= 1) {
      return {
        direction: 'same' as const,
        value: '0%',
      };
    }

    const prev = subscribersData[0]?.value ?? 0;
    const curr = subscribersData[subscribersData.length - 1]?.value ?? 0;

    // Calculate direction
    let direction: 'up' | 'down' | 'same' = 'same';
    if (curr > prev) {
      direction = 'up';
    } else if (curr < prev) {
      direction = 'down';
    }

    // Calculate percentage difference
    let value: string;
    if (prev === 0) {
      value = curr === 0 ? '0%' : '+100%';
    } else {
      const diff = ((curr - prev) / prev) * 100;
      const rounded = Math.round(diff * 10) / 10;
      value = `${diff >= 0 ? '+' : ''}${rounded}%`;
    }

    return { direction, value };
  }, [subscribersData]);

  // Update current tab if initialTab changes
  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  // Function to update tab and URL
  const handleTabChange = (tabValue: string) => {
    setCurrentTab(tabValue);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tabValue);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  const barChartConfig = {
    open_rate: {
      label: 'Open rate',
    },
  } satisfies ChartConfig;

  const tabConfig = useMemo(
    () => ({
      'total-subscribers': {
        color: 'var(--chart-darkblue)',
        datakey: 'value',
      },
      'avg-open-rate': {
        color: 'var(--chart-blue)',
        datakey: 'open_rate',
      },
      'avg-click-rate': {
        color: 'var(--chart-teal)',
        datakey: 'click_rate',
      },
      'avg-delivery-rate': {
        // Rendered as dots, not bars: delivery rates live within a few
        // points of 100%, so bar length from a zero baseline is unreadable
        // and a truncated bar axis would lie. Position encoding on a
        // data-floored axis shows the rate itself honestly.
        color: 'var(--chart-purple)',
        datakey: 'delivery_rate',
      },
    }),
    [],
  );

  // Prototype: per-send delivery rate, filterable by inbox provider (see
  // deliverability-breakdown.ts for the demo model and the real data notes).
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProviderKey>('all');

  const avgsWithDelivery = useMemo(() => {
    return avgsData.map((item, index) => ({
      ...item,
      delivery_rate: deliveryRateForSend(deliveryProvider, index, avgsData.length),
    }));
  }, [avgsData, deliveryProvider]);

  // The tab trigger always shows the overall average; the in-chart reference
  // line follows the provider filter.
  const avgDeliveryRateAll = useMemo(() => {
    if (avgsData.length === 0) {
      return 0;
    }
    return (
      avgsData.reduce(
        (sum, _item, index) => sum + deliveryRateForSend('all', index, avgsData.length),
        0,
      ) / avgsData.length
    );
  }, [avgsData]);

  const avgDeliveryRate = useMemo(() => {
    if (avgsWithDelivery.length === 0) {
      return 0;
    }
    return (
      avgsWithDelivery.reduce((sum, item) => sum + item.delivery_rate, 0) / avgsWithDelivery.length
    );
  }, [avgsWithDelivery]);

  // Calculate dynamic domain and ticks based on current tab's data
  const { barDomain, barTicks } = useMemo(() => {
    if (!avgsData || avgsData.length === 0 || currentTab === 'total-subscribers') {
      return { barDomain: [0, 1], barTicks: [0, 1] };
    }

    const dataKey = tabConfig[currentTab as keyof typeof tabConfig]?.datakey;
    if (!dataKey) {
      return { barDomain: [0, 1], barTicks: [0, 1] };
    }

    // Extract values for the current data key
    const values = avgsWithDelivery
      .map((item) => item[dataKey as keyof typeof item])
      .filter((val): val is number => typeof val === 'number');

    if (values.length === 0) {
      return { barDomain: [0, 1], barTicks: [0, 1] };
    }

    // Delivery rates cluster near 100%: floor the axis just below the data
    // (position encoding via dots, so a non-zero floor is honest).
    if (currentTab === 'avg-delivery-rate') {
      const minValue = Math.min(...values, avgDeliveryRate);
      const floor = Math.max(0, Math.floor((minValue - 0.002) * 100) / 100);
      return { barDomain: [floor, 1], barTicks: [floor, 1] };
    }

    // Include the avg line value so the y-axis always contains both the
    // tallest bar and the avg reference line.
    const avgForTab = currentTab === 'avg-open-rate' ? avgOpenRate : avgClickRate;
    const bucketValue = Math.max(Math.max(...values), avgForTab);

    // Min is always 0. Upper limit:
    //   < 1%       → 1%
    //   1% – 10%   → next whole percent above
    //   10% – 100% → next multiple of 10 above
    const finalMin = 0;
    let finalMax;
    if (bucketValue < 0.01) {
      finalMax = 0.01;
    } else if (bucketValue < 0.1) {
      finalMax = (Math.floor(bucketValue * 100) + 1) / 100;
    } else {
      finalMax = (Math.floor(bucketValue * 10) + 1) / 10;
    }

    return {
      barDomain: [finalMin, finalMax],
      barTicks: [finalMin, finalMax],
    };
  }, [
    avgsData,
    avgsWithDelivery,
    currentTab,
    tabConfig,
    avgOpenRate,
    avgClickRate,
    avgDeliveryRate,
  ]);

  if (isLoading) {
    return (
      <div className="-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center">
        <BarChartLoadingIndicator />
      </div>
    );
  }

  let gridClass = 'grid-cols-4';
  if (!emailTrackClicksEnabled || !emailTrackOpensEnabled) {
    gridClass = 'grid-cols-3';
  }
  if (!emailTrackClicksEnabled && !emailTrackOpensEnabled) {
    gridClass = 'grid-cols-2';
  }

  const showAvgLine =
    (currentTab === 'avg-open-rate' && avgOpenRate > barDomain[0] && avgOpenRate < barDomain[1]) ||
    (currentTab === 'avg-click-rate' &&
      avgClickRate > barDomain[0] &&
      avgClickRate < barDomain[1]) ||
    (currentTab === 'avg-delivery-rate' &&
      avgDeliveryRate > barDomain[0] &&
      avgDeliveryRate < barDomain[1]);
  const avgValue =
    currentTab === 'avg-open-rate'
      ? avgOpenRate
      : currentTab === 'avg-delivery-rate'
        ? avgDeliveryRate
        : avgClickRate;

  return (
    <Tabs defaultValue={initialTab} variant="kpis">
      <TabsList className={`-mx-6 hidden grid-cols-3 md:visible! md:grid! ${gridClass}`}>
        <KpiTabTrigger
          className={`${!emailTrackOpensEnabled && !emailTrackClicksEnabled && 'cursor-auto after:hidden'}`}
          value="total-subscribers"
          onClick={() => {
            handleTabChange('total-subscribers');
          }}
        >
          <KpiTabValue
            color={tabConfig['total-subscribers'].color}
            data-testid="total-subscribers-value"
            diffDirection={subscribersDiff.direction}
            diffValue={subscribersDiff.value}
            label="Total subscribers"
            value={formatNumber(totalSubscribers)}
          />
        </KpiTabTrigger>

        {emailTrackOpensEnabled && (
          <KpiTabTrigger
            value="avg-open-rate"
            onClick={() => {
              handleTabChange('avg-open-rate');
            }}
          >
            <KpiTabValue
              className={isAvgsLoading ? 'opacity-50' : ''}
              color={tabConfig['avg-open-rate'].color}
              label="Avg. open rate"
              value={formatPercentage(avgOpenRate)}
            />
          </KpiTabTrigger>
        )}

        {emailTrackClicksEnabled && (
          <KpiTabTrigger
            value="avg-click-rate"
            onClick={() => {
              handleTabChange('avg-click-rate');
            }}
          >
            <KpiTabValue
              className={isAvgsLoading ? 'opacity-50' : ''}
              color={tabConfig['avg-click-rate'].color}
              label="Avg. click rate"
              value={formatPercentage(avgClickRate)}
            />
          </KpiTabTrigger>
        )}

        <KpiTabTrigger
          value="avg-delivery-rate"
          onClick={() => {
            handleTabChange('avg-delivery-rate');
          }}
        >
          <KpiTabValue
            className={isAvgsLoading ? 'opacity-50' : ''}
            color={tabConfig['avg-delivery-rate'].color}
            label="Avg. delivery rate"
            value={formatPercentage(avgDeliveryRateAll)}
          />
        </KpiTabTrigger>
      </TabsList>
      <DropdownMenu>
        <DropdownMenuTrigger className="md:hidden" asChild>
          <KpiDropdownButton>
            {currentTab === 'total-subscribers' && (
              <KpiTabValue
                color={tabConfig['total-subscribers'].color}
                label="Total subscribers"
                value={formatNumber(totalSubscribers)}
              />
            )}
            {currentTab === 'avg-open-rate' && emailTrackOpensEnabled && (
              <KpiTabValue
                className={isAvgsLoading ? 'opacity-50' : ''}
                color={tabConfig['avg-open-rate'].color}
                label="Avg. open rate"
                value={formatPercentage(avgOpenRate)}
              />
            )}
            {currentTab === 'avg-click-rate' && emailTrackClicksEnabled && (
              <KpiTabValue
                className={isAvgsLoading ? 'opacity-50' : ''}
                color={tabConfig['avg-click-rate'].color}
                label="Avg. click rate"
                value={formatPercentage(avgClickRate)}
              />
            )}
            {currentTab === 'avg-delivery-rate' && (
              <KpiTabValue
                className={isAvgsLoading ? 'opacity-50' : ''}
                color={tabConfig['avg-delivery-rate'].color}
                label="Avg. delivery rate"
                value={formatPercentage(avgDeliveryRateAll)}
              />
            )}
          </KpiDropdownButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleTabChange('total-subscribers')}>
            Total subscribers
          </DropdownMenuItem>

          {emailTrackOpensEnabled && (
            <DropdownMenuItem onClick={() => handleTabChange('avg-open-rate')}>
              Avg. open rate
            </DropdownMenuItem>
          )}

          {emailTrackClicksEnabled && (
            <DropdownMenuItem onClick={() => handleTabChange('avg-click-rate')}>
              Avg. click rate
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => handleTabChange('avg-delivery-rate')}>
            Avg. delivery rate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500">
        {currentTab === 'total-subscribers' && (
          <GhAreaChart
            className="-mb-3 h-[16vw] max-h-[320px] min-h-[180px] w-full"
            color={tabConfig['total-subscribers'].color}
            data={subscribersData}
            id="mrr"
            range={chartRange}
          />
        )}

        {((currentTab === 'avg-open-rate' && emailTrackOpensEnabled) ||
          (currentTab === 'avg-click-rate' && emailTrackClicksEnabled) ||
          currentTab === 'avg-delivery-rate') && (
          <>
            {isAvgsLoading ? (
              <div className="h-[320px] w-full items-center justify-center">
                <BarChartLoadingIndicator />
              </div>
            ) : avgsData && avgsData.length > 0 ? (
              <>
                {currentTab === 'avg-delivery-rate' && (
                  <div className="mb-2 flex justify-end">
                    <Select
                      value={deliveryProvider}
                      onValueChange={(value) => setDeliveryProvider(value as DeliveryProviderKey)}
                    >
                      <SelectTrigger className="w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="all">All inbox providers</SelectItem>
                        {DELIVERY_PROVIDERS.map((provider) => (
                          <SelectItem key={provider.key} value={provider.key}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <ChartContainer
                  className="aspect-auto h-[200px] w-full md:h-[220px] xl:h-[320px]"
                  config={barChartConfig}
                >
                  <Recharts.ComposedChart
                    className={isHoveringClickable ? 'cursor-pointer!' : ''}
                    data={avgsWithDelivery}
                    margin={{
                      top: 20,
                    }}
                    onClick={(e) => {
                      // Recharts types activePayload as `any`; narrow the row we read.
                      const activePostId = (
                        e.activePayload?.[0] as { payload?: { post_id?: string } } | undefined
                      )?.payload?.post_id;
                      if (activePostId) {
                        navigate(`/posts/analytics/${activePostId}`);
                      }
                    }}
                    onMouseLeave={() => setIsHoveringClickable(false)}
                    onMouseMove={(e) => {
                      const activePostId = (
                        e.activePayload?.[0] as { payload?: { post_id?: string } } | undefined
                      )?.payload?.post_id;
                      setIsHoveringClickable(!!activePostId);
                    }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={tabConfig[currentTab].color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor={tabConfig[currentTab].color}
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    </defs>
                    <Recharts.CartesianGrid
                      horizontal={true}
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <Recharts.XAxis
                      axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                      dataKey="post_id"
                      interval={0}
                      stroke="var(--border)"
                      tickFormatter={() => ''}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <Recharts.YAxis
                      axisLine={false}
                      domain={barDomain}
                      tickFormatter={(value: number) => formatPercentage(value)}
                      tickLine={false}
                      ticks={barTicks}
                      width={calculateYAxisWidth(barTicks, (value: number) =>
                        formatPercentage(value),
                      )}
                    />
                    <ChartTooltip
                      content={<BarTooltipContent />}
                      cursor={false}
                      isAnimationActive={false}
                      position={{ y: 10 }}
                    />
                    {showAvgLine && (
                      <Recharts.ReferenceLine
                        label={{
                          value: `${formatPercentage(avgValue)}`,
                          position: 'left',
                          offset: 8,
                          fill: 'var(--muted-foreground)',
                        }}
                        opacity={0.5}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        y={avgValue}
                      />
                    )}
                    {currentTab === 'avg-delivery-rate' ? (
                      <Recharts.Line
                        activeDot={{ r: 6 }}
                        dataKey="delivery_rate"
                        dot={{ r: 4, fill: 'var(--chart-purple)', strokeWidth: 0 }}
                        isAnimationActive={false}
                        stroke="var(--chart-purple)"
                        strokeOpacity={0.35}
                        strokeWidth={1.5}
                        type="linear"
                      />
                    ) : (
                      <Recharts.Bar
                        activeBar={{ fillOpacity: 1 }}
                        dataKey={tabConfig[currentTab].datakey}
                        fill="url(#barGradient)"
                        fillOpacity={0.6}
                        isAnimationActive={false}
                        maxBarSize={32}
                        minPointSize={3}
                        radius={4}
                      />
                    )}
                  </Recharts.ComposedChart>
                </ChartContainer>
                <div className="-mt-4 text-center text-sm text-muted-foreground">
                  {currentTab === 'avg-delivery-rate'
                    ? 'Delivery rate per newsletter in this period'
                    : `Newsletters ${currentTab === 'avg-open-rate' ? 'opens' : 'clicks'} in this period`}
                </div>
              </>
            ) : (
              <EmptyIndicator
                className="size-full py-20"
                title={`No newsletters ${getPeriodText(range)}`}
              >
                <LucideIcon.Mail strokeWidth={1.5} />
              </EmptyIndicator>
            )}
          </>
        )}
      </div>
    </Tabs>
  );
};

export default NewsletterKPIs;
