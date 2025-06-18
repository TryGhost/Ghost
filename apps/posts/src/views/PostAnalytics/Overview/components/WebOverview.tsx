import React from 'react';
// import Sources from '../../Web/components/Sources';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, GhAreaChart, GhAreaChartDataItem, HTable, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, Separator, formatNumber} from '@tryghost/shade';
import {ProcessedSourceData, useNavigate, useParams} from '@tryghost/admin-x-framework';

interface WebOverviewProps {
    sourcesData?: ProcessedSourceData[] | null;
    chartData?: GhAreaChartDataItem[];
    range: number;
    isLoading: boolean;
    visitors: number;
}

const WebOverview: React.FC<WebOverviewProps> = ({chartData, range, isLoading, visitors}) => {
    const {postId} = useParams();
    const navigate = useNavigate();

    return (
        <>
            <Card className='group/card'>
                <div className='relative flex items-center justify-between gap-6'>
                    <CardHeader>
                        <CardTitle>Web performance</CardTitle>
                    </CardHeader>
                    <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:opacity-100' size='sm' variant='outline' onClick={() => {
                        navigate(`/analytics/beta/${postId}/web`);
                    }}>View more</Button>
                </div>
                <CardContent>
                    <KpiCardHeader className='group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0'>
                        <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                            <KpiCardHeaderLabel color='hsl(var(--chart-blue))'>
                            Unique visitors
                            </KpiCardHeaderLabel>
                            <KpiCardHeaderValue
                                value={formatNumber(visitors)}
                            />
                        </div>
                    </KpiCardHeader>
                    <Separator />
                    <div className='max-h-[288px] py-6 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                        {isLoading ?
                            <div className='flex h-[16vw] min-h-[240px] items-center justify-center'>
                                <BarChartLoadingIndicator />
                            </div>
                            :
                            <GhAreaChart
                                className={'h-[240px] w-full'}
                                color='hsl(var(--chart-blue))'
                                data={chartData || []}
                                id="visitors"
                                range={range}
                                syncId="overview-charts"
                            />
                        }
                    </div>
                    <Separator />
                    <div className='pt-3'>
                        <div className='flex items-center justify-between gap-3 py-3'>
                            <span className='font-semibold'>How people found your site</span>
                            <HTable>Visitors</HTable>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
};

export default WebOverview;
