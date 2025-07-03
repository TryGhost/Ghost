import GrowthSources from './components/GrowthSources';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Skeleton, SkeletonTable, formatNumber} from '@tryghost/shade';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostReferrers} from '@src/hooks/usePostReferrers';

export const centsToDollars = (value : number) => {
    return Math.round(value / 100);
};

interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    const {data: globalData} = useGlobalData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading, currencySymbol} = usePostReferrers(postId || '');
    const {appSettings} = useAppContext();

    // Get site URL and icon from global data
    const siteUrl = globalData?.url as string | undefined;
    const siteIcon = globalData?.icon as string | undefined;

    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing
    const testingSiteUrl = siteUrl || 'https://levernews.com';

    let containerClass = 'flex flex-col items-stretch gap-8';
    if (!appSettings?.paidMembersEnabled) {
        containerClass = 'grid grid-cols-2 gap-8';
    }

    return (
        <>
            <PostAnalyticsHeader currentTab='Growth' />
            <PostAnalyticsContent>
                {isLoading ?
                    <div className={containerClass}>
                        <Card>
                            <CardContent className='grid grid-cols-3 p-0'>
                                {Array.from({length: 3}, (_, i) => (
                                    <div key={i} className='h-[98px] gap-1 border-r px-6 py-5 last:border-r-0'>
                                        <Skeleton className='w-2/3' />
                                        <Skeleton className='h-7 w-12' />
                                    </div>
                                ))}

                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Top sources</CardTitle>
                                <CardDescription>Where did your growth come from?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                <SkeletonTable className='pt-6' />
                            </CardContent>
                        </Card>
                    </div>
                    :
                    <div className={containerClass}>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <div className='flex flex-col md:grid md:grid-cols-3 md:items-stretch'>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.User strokeWidth={1.5} />
                                            Free members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(totals?.free_members || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    {appSettings?.paidMembersEnabled &&
                                    <>
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
                                                <LucideIcon.Coins strokeWidth={1.5} />
                                            MRR
                                            </KpiCardLabel>
                                            <KpiCardContent>
                                                <KpiCardValue>+{currencySymbol}{centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                            </KpiCardContent>
                                        </KpiCard>
                                    </>
                                    }
                                </div>
                            </CardContent>
                        </Card>
                        <GrowthSources
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
