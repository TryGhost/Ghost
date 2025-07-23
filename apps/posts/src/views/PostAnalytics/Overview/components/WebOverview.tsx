import React, {useMemo} from 'react';
import Sources from '../../Web/components/Sources';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, EmptyIndicator, GhAreaChart, GhAreaChartDataItem, HTable, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Separator, formatNumber} from '@tryghost/shade';
import {BaseSourceData, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

interface WebOverviewProps {
    sourcesData: BaseSourceData[] | null;
    chartData?: GhAreaChartDataItem[];
    range: number;
    isLoading: boolean;
    visitors: number;
    isNewsletterShown?: boolean;
}

const WebOverview: React.FC<WebOverviewProps> = ({chartData, range, isLoading, visitors, sourcesData, isNewsletterShown = true}) => {
    const {postId} = useParams();
    const navigate = useNavigate();

    // Get global data for site info
    const {data: globalData} = useGlobalData();
    const siteUrl = globalData?.url as string | undefined;
    const siteIcon = globalData?.icon as string | undefined;

    // Calculate total visits for sources percentage calculation
    const totalSourcesVisits = useMemo(() => {
        if (!sourcesData) {
            return 0;
        }
        return sourcesData.reduce((sum, source) => sum + Number(source.visits || 0), 0);
    }, [sourcesData]);

    return (
        <>
            <Card className={`group/datalist overflow-hidden ${!isNewsletterShown && 'col-span-2'}`}>
                <div className='relative flex items-center justify-between gap-6'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-1.5 text-lg'>
                            <LucideIcon.Globe size={16} strokeWidth={1.5} />
                            Web performance
                        </CardTitle>
                    </CardHeader>
                    <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-300 group-hover/datalist:translate-x-0 group-hover/datalist:opacity-100' size='sm' variant='outline' onClick={() => {
                        navigate(`/analytics/${postId}/web`);
                    }}>View more</Button>
                </div>
                <CardContent>
                    <div>
                        <KpiCardHeader className='group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0' data-testid='unique-visitors'>
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
                                    className={'aspect-auto h-[240px] w-full'}
                                    color='hsl(var(--chart-blue))'
                                    data={chartData || []}
                                    id="visitors"
                                    range={range}
                                    syncId="overview-charts"
                                />
                            }
                        </div>
                    </div>
                    {isNewsletterShown &&
                        <div className={!isNewsletterShown ? '-mt-3' : 'border-t pt-3'}>
                            <div>
                                <div className='flex items-center justify-between gap-3 py-3'>
                                    <span className='font-medium text-muted-foreground'>How readers found this post</span>
                                    <HTable>Visitors</HTable>
                                </div>
                            </div>
                            {sourcesData && sourcesData.length > 0 ?
                                <Sources
                                    data={sourcesData as BaseSourceData[] | null}
                                    range={range}
                                    siteIcon={siteIcon}
                                    siteUrl={siteUrl}
                                    tableOnly={true}
                                    topSourcesLimit={5}
                                    totalVisitors={totalSourcesVisits}
                                />
                                :
                                <EmptyIndicator
                                    className='h-full py-10'
                                    description='Once someone visits this post, sources will show here'
                                    title={`No visitors since you published this post`}
                                >
                                    <LucideIcon.Globe strokeWidth={1.5} />
                                </EmptyIndicator>
                            }
                        </div>
                    }
                </CardContent>
            </Card>
        </>
    );
};

export default WebOverview;
