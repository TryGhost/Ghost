import React, {useEffect, useMemo, useState} from 'react';
import {BarChartLoadingIndicator, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, GhAreaChartDataItem, KpiDropdownButton, KpiTabTrigger, KpiTabValue, Separator, Tabs, TabsList, centsToDollars, formatDisplayDateWithRange, formatNumber} from '@tryghost/shade';
import {DiffDirection} from '@hooks/use-growth-stats';
import {STATS_RANGES} from '@src/utils/constants';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useAppContext} from '@src/app';
import {useGlobalData} from '@src/providers/global-data-provider';
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

type KpiTab = 'total-members' | 'free-members' | 'paid-members' | 'mrr';

const isValidTab = (tab: string | null | undefined): tab is KpiTab => {
    return tab === 'total-members' || tab === 'free-members' || tab === 'paid-members' || tab === 'mrr';
};

// Extended data type for paid members chart with additional tooltip fields
type PaidMembersChartDataItem = GhAreaChartDataItem & {
    comped: number;
    paid_subscribed?: number;
};

// Custom tooltip for paid members chart
const PaidMembersTooltipContent = ({active, payload, range, color, showBreakdown}: {
    active?: boolean;
    payload?: Array<{value: number; payload: PaidMembersChartDataItem}>;
    range?: number;
    color?: string;
    showBreakdown?: boolean;
}) => {
    if (!active || !payload?.length) {
        return null;
    }

    const data = payload[0].payload;
    const {date, formattedValue, label, comped} = data;
    const paidSubscriptions = data.value - (comped || 0);

    return (
        <div className="min-w-[200px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="mb-1 text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0)}</div>}
            <div className='flex flex-col gap-1'>
                {showBreakdown && (
                    <>
                        <div className='flex items-center gap-2'>
                            <div className='flex grow items-center justify-between gap-5'>
                                <div className="text-sm text-muted-foreground">Paid subscriptions</div>
                                <div className="font-mono text-xs">{formatNumber(paidSubscriptions)}</div>
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='flex grow items-center justify-between gap-5'>
                                <div className="text-sm text-muted-foreground">Complimentary</div>
                                <div className="font-mono text-xs">{(comped !== undefined && comped > 0) ? (formatNumber(comped)) : '0'}</div>
                            </div>
                        </div>
                        <Separator />
                    </>
                )}
                <div className='flex items-center gap-2'>
                    <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color || 'hsl(var(--chart-purple))'}}></span>
                    <div className='flex grow items-center justify-between gap-5'>
                        {label && <div className="text-sm text-muted-foreground">{label}</div>}
                        <div className="font-mono font-medium">{formattedValue}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GrowthKPIs: React.FC<{
    chartData: ChartDataItem[];
    totals: Totals;
    initialTab?: string;
    currencySymbol: string;
    isLoading: boolean;
    onTabChange?: (tab: KpiTab) => void;
}> = ({chartData: allChartData, totals, initialTab, currencySymbol, isLoading, onTabChange}) => {
    const validatedInitialTab = isValidTab(initialTab) ? initialTab : 'total-members';
    const [currentTab, setCurrentTab] = useState<KpiTab>(validatedInitialTab);
    const {range} = useGlobalData();
    const {appSettings} = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Update current tab if initialTab changes
    useEffect(() => {
        setCurrentTab(validatedInitialTab);
    }, [validatedInitialTab]);

    // Function to update tab and URL
    const handleTabChange = (tabValue: KpiTab) => {
        setCurrentTab(tabValue);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabValue);
        navigate(`?${newSearchParams.toString()}`, {replace: true});
        // Notify parent component of tab change
        if (onTabChange) {
            onTabChange(tabValue);
        }
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
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: item.free,
                    formattedValue: formatNumber(item.free),
                    label: 'Free members'
                };
            });
            break;
        case 'paid-members':
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: item.paid,
                    formattedValue: formatNumber(item.paid),
                    label: 'Paid members',
                    comped: item.comped,
                    paid_subscribed: item.paid_subscribed
                };
            });
            break;
        case 'mrr':
            processedData = sanitizedData.map((item) => {
                return {
                    ...item,
                    value: centsToDollars(item.mrr),
                    formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
                    label: 'MRR'
                };
            });
            break;
        default:
            processedData = sanitizedData.map((item) => {
                // Note: item.paid already includes comped members
                const currentTotal = item.free + item.paid;
                return {
                    ...item,
                    value: currentTotal,
                    formattedValue: formatNumber(currentTotal),
                    label: 'Total members'
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

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    const areaChartClassname = '-mb-3 h-[16vw] max-h-[320px] w-full min-h-[180px]';

    return (
        <Tabs defaultValue={validatedInitialTab} variant='kpis'>
            <TabsList className={`-mx-6 ${appSettings?.paidMembersEnabled ? 'hidden grid-cols-4 lg:!visible lg:!grid' : 'grid grid-cols-4'}`}>
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
            {appSettings?.paidMembersEnabled &&
                <DropdownMenu>
                    <DropdownMenuTrigger className='lg:hidden' asChild>
                        <KpiDropdownButton>
                            {currentTab === 'total-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-darkblue))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.total}
                                    diffValue={percentChanges.total}
                                    label="Total members"
                                    value={formatNumber(totalMembers)}
                                />
                            }
                            {currentTab === 'free-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-blue))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.free}
                                    diffValue={percentChanges.free}
                                    label="Free members"
                                    value={formatNumber(freeMembers)}
                                />
                            }
                            {currentTab === 'paid-members' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-purple))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.paid}
                                    diffValue={percentChanges.paid}
                                    label="Paid members"
                                    value={formatNumber(paidMembers)}
                                />
                            }
                            {currentTab === 'mrr' &&
                                <KpiTabValue
                                    color='hsl(var(--chart-teal))'
                                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : directions.mrr}
                                    diffValue={percentChanges.mrr}
                                    label="MRR"
                                    value={`${currencySymbol}${formatNumber(centsToDollars(mrr))}`}
                                />
                            }
                        </KpiDropdownButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className="w-56">
                        <DropdownMenuItem onClick={() => handleTabChange('total-members')}>Total members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('free-members')}>Free members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('paid-members')}>Paid members</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTabChange('mrr')}>MRR</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            }
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                <GhAreaChart
                    className={areaChartClassname}
                    color={tabConfig[currentTab].color}
                    data={chartData}
                    dataFormatter={currentTab === 'mrr'
                        ?
                        (value: number) => {
                            return `${currencySymbol}${formatNumber(value)}`;
                        } :
                        formatNumber}
                    id={currentTab}
                    range={range}
                    tooltipContent={currentTab === 'paid-members' ? <PaidMembersTooltipContent color={tabConfig['paid-members'].color} range={range} showBreakdown={true} /> : undefined}
                />
            </div>
        </Tabs>
    );
};

export default GrowthKPIs;
