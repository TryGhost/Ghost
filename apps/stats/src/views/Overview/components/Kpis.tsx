import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import React, {useState} from 'react';
import {Card, CardContent, CardHeader, ChartConfig, ChartContainer, ChartTooltip, Recharts, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {formatDisplayDate, formatDuration, formatNumber, formatPercentage, formatQueryDate} from '@src/utils/data-formatters';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

interface KpiTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const KpiTabTrigger: React.FC<KpiTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='h-auto' {...props}>
            {children}
        </TabsTrigger>
    );
};

interface KpiTabValueProps {
    label: string;
    value: string | number;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value}) => {
    return (
        <div className='flex w-full min-w-[170px] flex-col items-start'>
            <span className='text-lg'>{label}</span>
            <span className='text-[2.3rem] tracking-[-0.04em]'>{value}</span>
        </div>
    );
};

type KpiMetric = {
    dataKey: string;
    label: string;
    formatter: (value: number) => string;
};

const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visits',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        formatter: formatDuration
    }
};

const Kpis:React.FC = () => {
    const {data: configData, isLoading: isConfigLoading} = useGlobalData();
    const [currentTab, setCurrentTab] = useState('visits');

    // Calculate last 30 days range
    // TODO: move this to a selectable date range
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const params = {
        site_uuid: configData?.config.stats?.id || '',
        date_from: formatQueryDate(thirtyDaysAgo),
        date_to: formatQueryDate(today)
    };

    const {data, loading} = useQuery({
        endpoint: 'https://api.tinybird.co/v0/pipes/api_kpis__v7.json',
        token: configData?.config.stats?.token || '',
        params
    });

    const isLoading = isConfigLoading || loading;

    const currentMetric = KPI_METRICS[currentTab];

    const chartData = data?.map((item) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: item.date,
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    // Calculate KPI values
    const getKpiValues = () => {
        if (!data?.length) {
            return {visits: 0, views: 0, bounceRate: 0, duration: 0};
        }

        const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
        const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);
        const avgBounceRate = data.reduce((sum, item) => sum + Number(item.bounce_rate), 0) / data.length;
        const avgDuration = data.reduce((sum, item) => sum + Number(item.avg_session_sec), 0) / data.length;

        return {
            visits: formatNumber(totalVisits),
            views: formatNumber(totalViews),
            bounceRate: formatPercentage(avgBounceRate),
            duration: formatDuration(avgDuration)
        };
    };

    const kpiValues = getKpiValues();

    const chartConfig = {
        value: {
            label: currentMetric.label
        }
    } satisfies ChartConfig;

    return (
        <Card className='col-span-2'>
            <Tabs defaultValue="visits" variant='underline'>
                <CardHeader>
                    <TabsList className="flex">
                        <KpiTabTrigger value="visits" onClick={() => {
                            setCurrentTab('visits');
                        }}>
                            <KpiTabValue label="Unique visits" value={kpiValues.visits} />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="views" onClick={() => {
                            setCurrentTab('views');
                        }}>
                            <KpiTabValue label="Pageviews" value={kpiValues.views} />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="bounce-rate" onClick={() => {
                            setCurrentTab('bounce-rate');
                        }}>
                            <KpiTabValue label="Bounce rate" value={kpiValues.bounceRate} />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="visit-duration" onClick={() => {
                            setCurrentTab('visit-duration');
                        }}>
                            <KpiTabValue label="Visit duration" value={kpiValues.duration} />
                        </KpiTabTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className='min-h-[15vw]'>
                    {isLoading ? 'Loading' :
                        <ChartContainer className='-mb-3 max-h-[15vw] min-h-[260px] w-full' config={chartConfig}>
                            <Recharts.LineChart
                                data={chartData}
                                margin={{
                                    left: 0,
                                    right: 20,
                                    top: 12
                                }}
                                accessibilityLayer
                            >
                                <Recharts.CartesianGrid horizontal={false} vertical={false} />
                                <Recharts.XAxis
                                    axisLine={false}
                                    dataKey="date"
                                    interval={0}
                                    tickFormatter={formatDisplayDate}
                                    tickLine={false}
                                    tickMargin={8}
                                    ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                                />
                                <Recharts.YAxis
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        switch (currentTab) {
                                        case 'bounce-rate':
                                            return formatPercentage(value);
                                        case 'visit-duration':
                                            return formatDuration(value);
                                        case 'visits':
                                        case 'views':
                                            return formatNumber(value);
                                        default:
                                            return value.toLocaleString();
                                        }
                                    }}
                                    tickLine={false}
                                    ticks={getYTicks(chartData || [])}
                                    width={calculateYAxisWidth(getYTicks(chartData || []), currentMetric.formatter)}
                                />
                                <ChartTooltip
                                    content={<CustomTooltipContent />}
                                    cursor={true}
                                />
                                <Recharts.Line
                                    dataKey="value"
                                    dot={false}
                                    isAnimationActive={false}
                                    stroke="#8E42FF"
                                    strokeWidth={2}
                                    type='bump'
                                />
                            </Recharts.LineChart>
                        </ChartContainer>
                    }
                </CardContent>
            </Tabs>
        </Card>
    );
};

export default Kpis;
