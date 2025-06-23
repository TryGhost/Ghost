import React, {useEffect, useMemo, useState} from 'react';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, GhAreaChart, GhAreaChartDataItem, KpiTabTrigger, KpiTabValue, Recharts, Tabs, TabsContent, TabsList, TabsTrigger, centsToDollars, formatNumber} from '@tryghost/shade';
import {DiffDirection} from '@src/hooks/useGrowthStats';
import {STATS_RANGES} from '@src/utils/constants';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';

type ChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
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

    // Create chart data based on selected tab
    const chartData = useMemo(() => {
        if (!allChartData || allChartData.length === 0) {
            return [];
        }

        // First sanitize the data based on the selected field
        let sanitizedData: ChartDataItem[] = [];
        let fieldName: keyof ChartDataItem = 'value';

        switch (currentTab) {
        case 'free-members':
            fieldName = 'free';
            break;
        case 'paid-members':
            fieldName = 'paid';
            break;
        case 'mrr': {
            fieldName = 'mrr';
            break;
        }
        default:
            fieldName = 'value';
        }

        sanitizedData = sanitizeChartData(allChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        let processedData: GhAreaChartDataItem[] = [];

        switch (currentTab) {
        case 'free-members':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : item.free - sanitizedData[index - 1].free;
                return {
                    ...item,
                    value: item.free,
                    formattedValue: formatNumber(item.free),
                    label: 'Free members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
            break;
        case 'paid-members':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : item.paid - sanitizedData[index - 1].paid;
                return {
                    ...item,
                    value: item.paid,
                    formattedValue: formatNumber(item.paid),
                    label: 'Paid members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
            break;
        case 'mrr':
            processedData = sanitizedData.map((item, index) => {
                const diffValue = index === 0 ? null : centsToDollars(item.mrr) - centsToDollars(sanitizedData[index - 1].mrr);
                return {
                    ...item,
                    value: centsToDollars(item.mrr),
                    formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
                    label: 'MRR',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${currencySymbol}${formatNumber(diffValue * -1)}` : `+${currencySymbol}${formatNumber(diffValue)}`)
                };
            });
            break;
        default:
            processedData = sanitizedData.map((item, index) => {
                const currentTotal = item.free + item.paid + item.comped;
                const previousTotal = index === 0 ? null : sanitizedData[index - 1].free + sanitizedData[index - 1].paid + sanitizedData[index - 1].comped;
                const diffValue = index === 0 ? null : currentTotal - previousTotal!;
                return {
                    ...item,
                    value: currentTotal,
                    formattedValue: formatNumber(currentTotal),
                    label: 'Total members',
                    diffValue,
                    formattedDiffValue: diffValue === null ? null : (diffValue < 0 ? `-${formatNumber(diffValue)}` : `+${formatNumber(diffValue)}`)
                };
            });
        }

        return processedData;
    }, [currentTab, allChartData, range, currencySymbol]);

    const tabConfig = {
        'total-members': {
            color: 'hsl(var(--chart-darkblue))'
        },
        'free-members': {
            color: 'hsl(var(--chart-blue))'
        },
        'paid-members': {
            color: 'hsl(var(--chart-purple))'
        },
        mrr: {
            color: 'hsl(var(--chart-teal))'
        }
    };

    const paidChangeChartData = useMemo(() => {
        if (currentTab !== 'paid-members') {
            return [];
        }

        return [
            {date: '25 May', new: 142, cancelled: -67},
            {date: '26 May', new: 189, cancelled: -89},
            {date: '27 May', new: 156, cancelled: -45},
            {date: '28 May', new: 178, cancelled: -92},
            {date: '29 May', new: 134, cancelled: -78},
            {date: '30 May', new: 201, cancelled: -112},
            {date: '31 May', new: 167, cancelled: -54},
            {date: '01 Jun', new: 145, cancelled: -73},
            {date: '02 Jun', new: 198, cancelled: -96},
            {date: '03 Jun', new: 223, cancelled: -118},
            {date: '04 Jun', new: 156, cancelled: -67},
            {date: '05 Jun', new: 189, cancelled: -84},
            {date: '06 Jun', new: 234, cancelled: -125},
            {date: '07 Jun', new: 178, cancelled: -91},
            {date: '08 Jun', new: 203, cancelled: -106},
            {date: '09 Jun', new: 167, cancelled: -78},
            {date: '10 Jun', new: 145, cancelled: -63},
            {date: '11 Jun', new: 212, cancelled: -94},
            {date: '12 Jun', new: 189, cancelled: -102},
            {date: '13 Jun', new: 156, cancelled: -71},
            {date: '14 Jun', new: 234, cancelled: -138},
            {date: '15 Jun', new: 198, cancelled: -89},
            {date: '16 Jun', new: 167, cancelled: -76},
            {date: '17 Jun', new: 245, cancelled: -142},
            {date: '18 Jun', new: 178, cancelled: -95},
            {date: '19 Jun', new: 203, cancelled: -108},
            {date: '20 Jun', new: 189, cancelled: -83},
            {date: '21 Jun', new: 156, cancelled: -69},
            {date: '22 Jun', new: 134, cancelled: -52},
            {date: '23 Jun', new: 198, cancelled: -87}
        ];
    }, [currentTab]);

    const paidChangeChartConfig = {
        new: {
            label: 'New',
            color: 'hsl(var(--chart-teal))'
        },
        cancelled: {
            label: 'Cancelled',
            color: 'hsl(var(--chart-rose))'
        }
    } satisfies ChartConfig;

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
                        defaultValue="total"
                        variant="button-sm"
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
                                color={tabConfig[currentTab as keyof typeof tabConfig].color}
                                data={chartData}
                                dataFormatter={formatNumber}
                                id="paid-members"
                                range={range}
                            />
                        </TabsContent>
                        <TabsContent value="change">
                            <ChartContainer className='mt-6 max-h-[280px] w-full' config={paidChangeChartConfig}>
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
                                                                    {paidChangeChartConfig[name as keyof typeof paidChangeChartConfig]?.label || name}
                                                                </span>
                                                            </div>
                                                            <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                                                                {Number(value) < 0 ? formatNumber(Number(value) * -1) : formatNumber(value)}
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
                                        minPointSize={3}
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                </Recharts.BarChart>
                            </ChartContainer>
                            <div className='flex items-center justify-center gap-6 text-sm text-muted-foreground'>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: paidChangeChartConfig.new.color
                                        }}
                                    ></span>
                                    New
                                </div>
                                <div className='flex items-center gap-1'>
                                    <span className='size-2 rounded-full opacity-50'
                                        style={{
                                            backgroundColor: paidChangeChartConfig.cancelled.color
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