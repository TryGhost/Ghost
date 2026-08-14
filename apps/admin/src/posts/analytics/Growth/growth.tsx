import GrowthSources from './components/growth-sources';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardMoreButton, KpiCardValue} from '@/posts/analytics/components/kpi-card';
import PostAnalyticsContent from '@/posts/analytics/components/post-analytics-content';
import PostAnalyticsHeader from '@/posts/analytics/components/post-analytics-header';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, Skeleton, SkeletonTable} from '@tryghost/shade/components';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {buildMembersUrl} from '@/members/member-route';
import {centsToDollars} from '@/posts/analytics/Growth/growth-helpers';
import {useAnalyticsData} from '@/shared/analytics/use-analytics-data';
import {useAppContext} from '@tryghost/admin-x-framework';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostReferrers} from '@/posts/analytics/hooks/use-post-referrers';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    const {site} = useAnalyticsData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading, currencySymbol} = usePostReferrers(postId || '');
    const {appSettings} = useAppContext();
    const navigate = useNavigate();
    const navigateToMembers = (filter: string) => navigate(buildMembersUrl({filter}));

    // Get site URL and icon for source favicons
    const siteUrl = site.url;
    const siteIcon = site.icon;

    let containerClass = 'flex flex-col items-stretch gap-6';
    let cardClass = '';
    if (!appSettings?.paidMembersEnabled) {
        containerClass = 'grid grid-cols-1 border rounded-md';
        cardClass = 'border-none hover:shadow-none';
    }

    return (
        <>
            <PostAnalyticsHeader currentTab='Growth' />
            <PostAnalyticsContent>
                {isLoading ?
                    <div className={containerClass}>
                        <Card className={cardClass}>
                            <CardContent className='grid grid-cols-3 p-0'>
                                {Array.from({length: 3}, (_, i) => (
                                    <div key={i} className='h-[98px] gap-1 border-r px-6 py-5 last:border-r-0'>
                                        <Skeleton className='w-2/3' />
                                        <Skeleton className='h-7 w-12' />
                                    </div>
                                ))}

                            </CardContent>
                        </Card>
                        <Card className={cardClass}>
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
                        <Card className={cardClass} data-testid='members-card'>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <div className={`flex flex-col md:grid md:items-stretch ${appSettings?.paidMembersEnabled ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
                                    <KpiCard className='grow'>
                                        <KpiCardMoreButton onClick={() => {
                                            navigateToMembers(`signup:'${postId}'+conversion:-'${postId}'`);
                                        }}>
                                            View members &rarr;
                                        </KpiCardMoreButton>
                                        <KpiCardLabel onClick={() => {
                                            navigateToMembers(`signup:'${postId}'+conversion:-'${postId}'`);
                                        }}>
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
                                            <KpiCardMoreButton onClick={() => {
                                                navigateToMembers(`conversion:'${postId}'`);
                                            }}>
                                                View members &rarr;
                                            </KpiCardMoreButton>
                                            <KpiCardLabel onClick={() => {
                                                navigateToMembers(`conversion:'${postId}'`);
                                            }}>
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
                        {!appSettings?.paidMembersEnabled && <Separator />}
                        <GrowthSources
                            className={cardClass}
                            data={postReferrers}
                            mode="growth"
                            siteIcon={siteIcon}
                            siteUrl={siteUrl}
                        />
                    </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Growth;
