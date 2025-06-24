import React, {useEffect, useState} from 'react';
import {BarChartLoadingIndicator, ChartContainer, ChartTooltip, ChartTooltipContent, GhAreaChart, KpiTabTrigger, KpiTabValue, Recharts, Tabs, TabsContent, TabsList, TabsTrigger, centsToDollars, formatNumber} from '@tryghost/shade';
import {DiffDirection} from '@src/hooks/useGrowthStats';
import {GROWTH_TAB_CONFIG, PAID_CHANGE_CHART_CONFIG} from '../constants';
import {STATS_RANGES} from '@src/utils/constants';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthChartData} from '../hooks/useGrowthChartData';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    paid_subscribed?: number;
    paid_canceled?: number;
    formattedValue: string;
    label?: string;
};

type Totals = {
    totalMembers: number;
    freeMembers: number;
    paidMembers: number;
    mrr: number;
    percentChanges: {
        total: string;
        free: string;
        paid: string;
        mrr: string;
    };
    directions: {
        total: DiffDirection;
        free: DiffDirection;
        paid: DiffDirection;
        mrr: DiffDirection;
    };
};

const GrowthKPIs: React.FC<{
    chartData: ChartDataItem[];
    totals: Totals;
    initialTab?: string;
    currencySymbol: string;
    isLoading: boolean;
}> = ({chartData: allChartData, totals, initialTab = 'total-members', currencySymbol, isLoading}) => {
    const [currentTab, setCurrentTab] = useState(initialTab);
    const [paidChartTab, setPaidChartTab] = useState('total');
    const {range} = useGlobalData();
    const {appSettings} = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Update current tab if initialTab changes
    useEffect(() => {
        setCurrentTab(initialTab);
    }, [initialTab]);

    // Function to update tab and URL
    const handleTabChange = (tabValue: string) => {
        setCurrentTab(tabValue);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabValue);
        navigate(`?${newSearchParams.toString()}`, {replace: true});
    };

    const {totalMembers, freeMembers, paidMembers, mrr, percentChanges, directions} = totals;
    const {chartData, paidChangeChartData} = useGrowthChartData(currentTab, allChartData, range, currencySymbol);

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    const areaChartClassname = '-mb-3 h-[16vw] max-h-[320px] w-full';

    return (
        <Tabs defaultValue={initialTab} variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-4">
                <KpiTabTrigger className={!appSettings?.paidMembersEnabled ? 'cursor-auto after:hidden' : ''} value="total-members" onClick={() => {
                    if (appSettings?.paidMembersEnabled) {
                        handleTabChange('total-members');
                    }
                }}>
                    <KpiTabValue
                        color='hsl(var(--chart-darkblue))'
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.total}
                        diffValue={percentChanges.total}
                        label="Total members"
                        value={formatNumber(totalMembers)}
                    />
                </KpiTabTrigger>
                {appSettings?.paidMembersEnabled &&
                <>

                    <KpiTabTrigger value="free-members" onClick={() => {
                        handleTabChange('free-members');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-blue))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.free}
                            diffValue={percentChanges.free}
                            label="Free members"
                            value={formatNumber(freeMembers)}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger value="paid-members" onClick={() => {
                        handleTabChange('paid-members');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-purple))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.paid}
                            diffValue={percentChanges.paid}
                            label="Paid members"
                            value={formatNumber(paidMembers)}
                        />
                    </KpiTabTrigger>
                    <KpiTabTrigger value="mrr" onClick={() => {
                        handleTabChange('mrr');
                    }}>
                        <KpiTabValue
                            color='hsl(var(--chart-teal))'
                            diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.mrr}
                            diffValue={percentChanges.mrr}
                            label="MRR"
                            value={`${currencySymbol}${formatNumber(centsToDollars(mrr))}`}
                        />
                    </KpiTabTrigger>
                </>
                }
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {currentTab === 'paid-members' ?
                    <Tabs
                        defaultValue={paidChartTab}
                        variant="button-sm"
                        onValueChange={(value) => {
                            setPaidChartTab(value);
                        }}
                    >
                        <div className='mb-4 mt-2 flex w-full items-center justify-start'>
                            <TabsList className="flex items-center">
                                <TabsTrigger value="total">
                                Total
                                </TabsTrigger>
                                <TabsTrigger value="change">
                                Change
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="total">
                            <GhAreaChart
                                className={areaChartClassname}
                                color={GROWTH_TAB_CONFIG[currentTab as keyof typeof GROWTH_TAB_CONFIG].color}
                                data={chartData}
                                dataFormatter={formatNumber}
                                id="paid-members"
                                range={range}
                            />
                        </TabsContent>
                        <TabsContent value="change">
                            <ChartContainer className='mt-6 max-h-[280px] w-full' config={PAID_CHANGE_CHART_CONFIG}>
                                <Recharts.BarChart
                                    data={paidChangeChartData}
                                    stackOffset='sign'
                                >
                                    <defs>
                                        <linearGradient id="tealGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor={'var(--color-new)'} stopOpacity={0.8} />
                                            <stop offset="100%" stopColor={'var(--color-new)'} stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <defs>
                                        <linearGradient id="roseGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor={'var(--color-cancelled)'} stopOpacity={0.6} />
                                            <stop offset="100%" stopColor={'var(--color-cancelled)'} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <Recharts.CartesianGrid vertical={false} />
                                    <Recharts.XAxis
                                        axisLine={false}
                                        dataKey="date"
                                        tickFormatter={() => ('')}
                                        tickLine={false}
                                        tickMargin={10}
                                    />
                                    <Recharts.YAxis
                                        axisLine={false}
                                        tickFormatter={(value) => {
                                            return value < 0 ? formatNumber(value * -1) : formatNumber(value);
                                        }}
                                        tickLine={false}
                                    />
                                    <ChartTooltip
                                        content={<ChartTooltipContent
                                            className='!min-w-[120px] px-3 py-2'
                                            formatter={(value, name, payload, index) => {
                                                const rawValue = Number(value);
                                                let displayValue = '0';
                                                if (rawValue === 0) {
                                                    displayValue = '0';
                                                } else {
                                                    displayValue = rawValue < 0 ? formatNumber(rawValue * -1) : formatNumber(rawValue);
                                                }

                                                return (
                                                    <div className='flex w-full flex-col'>
                                                        {index === 0 &&
                                                            <div className="mb-1 text-sm font-medium text-foreground">
                                                                {payload?.payload?.date}
                                                            </div>
                                                        }
                                                        <div className='flex w-full items-center justify-between gap-4'>
                                                            <div className='flex items-center gap-1'>
                                                                <div
                                                                    className="size-2 shrink-0 rounded-full bg-[var(--color-bg)] opacity-50"
                                                                    style={{
                                                                        '--color-bg': `var(--color-${name})`
                                                                    } as React.CSSProperties}
                                                                />
                                                                <span className='text-sm text-muted-foreground'>
                                                                    {PAID_CHANGE_CHART_CONFIG[name as keyof typeof PAID_CHANGE_CHART_CONFIG]?.label || name}
                                                                </span>
                                                            </div>
                                                            <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                                                                {displayValue}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                            hideLabel
                                        />}
                                        cursor={false}
                                        isAnimationActive={false}
                                        position={{y: 10}}
                                    />
                                    <Recharts.Bar
                                        activeBar={{fillOpacity: 1}}
                                        dataKey="new"
                                        fill='url(#tealGradient)'
                                        fillOpacity={0.75}
                                        maxBarSize={32}
                                        minPointSize={3}
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                    <Recharts.Bar
                                        activeBar={{fillOpacity: 1}}
                                        dataKey="cancelled"
                                        fill='url(#roseGradient)'
                                        fillOpacity={0.75}
                                        maxBarSize={32}
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                </Recharts.BarChart>
                            </ChartContainer>
                            <div className='flex items-center justify-center gap-6 text-sm text-muted-foreground'>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: PAID_CHANGE_CHART_CONFIG.new.color
                                        }}
                                    ></span>
                                    New
                                </div>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: PAID_CHANGE_CHART_CONFIG.cancelled.color
                                        }}
                                    ></span>
                                    Cancelled
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                    :
                    <GhAreaChart
                        className={areaChartClassname}
                        color={tabConfig[currentTab as keyof typeof tabConfig].color}
                        data={chartData}
                        dataFormatter={currentTab === 'mrr'
                            ?
                            (value: number) => {
                                return `${currencySymbol}${formatNumber(value)}`;
                            } :
                            formatNumber}
                        id="mrr"
                        range={range}
                    />
                }
            </div>
        </Tabs>
    );
};

export default GrowthKPIs;