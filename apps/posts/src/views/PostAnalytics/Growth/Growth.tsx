import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import React from 'react';
import {BarChartLoadingIndicator, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, formatNumber} from '@tryghost/shade';
import {SourcesCard, useParams} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {usePostReferrers} from '@src/hooks/usePostReferrers';

export const centsToDollars = (value : number) => {
    return Math.round(value / 100);
};

interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    const {data: globalData} = useGlobalData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');
    
    // Get site URL and icon from global data
    const siteUrl = globalData?.url as string | undefined;
    const siteIcon = globalData?.icon as string | undefined;
    
    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing  
    const testingSiteUrl = siteUrl || 'https://levernews.com';

    return (
        <>
            <PostAnalyticsHeader currentTab='Growth' />
            <PostAnalyticsContent>
                {isLoading ?
                    <div className='flex size-full grow items-center justify-center'>
                        <BarChartLoadingIndicator />
                    </div>
                    :
                    <div className='flex flex-col items-stretch gap-6'>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <div className='grid grid-cols-3 items-stretch'>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.User strokeWidth={1.5} />
                                            Free members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(totals?.free_members || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.WalletCards strokeWidth={1.5} />
                                            Paid members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(totals?.paid_members || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.CircleDollarSign strokeWidth={1.5} />
                                            MRR
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>+${centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                            </CardContent>
                        </Card>
                        <SourcesCard 
                            data={postReferrers}
                            mode="growth"
                            siteIcon={siteIcon}
                            siteUrl={testingSiteUrl}
                        />
                    </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Growth;
