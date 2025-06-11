import React, {useEffect, useMemo, useState} from 'react';
import {BarChartLoadingIndicator, GhAreaChart, GhAreaChartDataItem, KpiTabTrigger, KpiTabValue, Tabs, TabsList, centsToDollars, formatNumber} from '@tryghost/shade';
import {DiffDirection} from '@src/hooks/useGrowthStats';
import {STATS_RANGES} from '@src/utils/constants';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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

    // Update current tab if initialTab changes
    useEffect(() => {
        setCurrentTab(initialTab);
    }, [initialTab]);

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
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.free,
                formattedValue: formatNumber(item.free),
                label: 'Free members'
            }));
            break;
        case 'paid-members':
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.paid,
                formattedValue: formatNumber(item.paid),
                label: 'Paid members'
            }));
            break;
        case 'mrr':
            processedData = sanitizedData.map(item => ({
                ...item,
                value: centsToDollars(item.mrr),
                formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
                label: 'MRR'
            }));
            break;
        default:
            processedData = sanitizedData.map(item => ({
                ...item,
                value: item.free + item.paid + item.comped,
                formattedValue: formatNumber(item.free + item.paid + item.comped),
                label: 'Total members'
            }));
        }

        return processedData;
    }, [currentTab, allChartData, range, currencySymbol]);

    const tabConfig = {
        'total-members': {
            color: 'hsl(var(--chart-teal))'
        },
        'free-members': {
            color: 'hsl(var(--chart-blue))'
        },
        'paid-members': {
            color: 'hsl(var(--chart-yellow))'
        },
        mrr: {
            color: 'hsl(var(--chart-purple))'
        }
    };

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    return (
        <Tabs defaultValue={initialTab} variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-4">
                <KpiTabTrigger value="total-members" onClick={() => {
                    setCurrentTab('total-members');
                }}>
                    <KpiTabValue
                        color='hsl(var(--chart-teal))'
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.total}
                        diffValue={percentChanges.total}
                        label="Total members"
                        value={formatNumber(totalMembers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="free-members" onClick={() => {
                    setCurrentTab('free-members');
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
                    setCurrentTab('paid-members');
                }}>
                    <KpiTabValue
                        color='hsl(var(--chart-yellow))'
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.paid}
                        diffValue={percentChanges.paid}
                        label="Paid members"
                        value={formatNumber(paidMembers)}
                    />
                </KpiTabTrigger>
                <KpiTabTrigger value="mrr" onClick={() => {
                    setCurrentTab('mrr');
                }}>
                    <KpiTabValue
                        color='hsl(var(--chart-purple))'
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.mrr}
                        diffValue={percentChanges.mrr}
                        label="MRR"
                        value={`${currencySymbol}${formatNumber(centsToDollars(mrr))}`}
                    />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                <GhAreaChart
                    className='-mb-3 h-[16vw] max-h-[320px] w-full'
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
            </div>
        </Tabs>
    );
};

export default GrowthKPIs;