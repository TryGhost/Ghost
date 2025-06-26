import FeatureImagePlaceholder from '../../components/FeatureImagePlaceholder';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, SkeletonTable, TableHead, TableRow, abbreviateNumber, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {TopPostViewsStats} from '@tryghost/admin-x-framework/api/stats';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useAppContext, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface TopPostsData {
    stats?: TopPostViewsStats[];
}

interface TopPostsProps {
    topPostsData: TopPostsData | undefined;
    isLoading: boolean;
}

const TopPosts: React.FC<TopPostsProps> = ({
    topPostsData,
    isLoading
}) => {
    const navigate = useNavigate();
    const {range} = useGlobalData();
    const {appSettings} = useAppContext();

    // Show open rate if newsletters are enabled and email tracking is enabled
    const showWebAnalytics = appSettings?.analytics.webAnalytics;
    const showOpenRate = appSettings?.newslettersEnabled && appSettings?.analytics.emailTrackOpens;

    const metricClass = 'flex items-center justify-end gap-1 rounded-md px-2 py-1 font-mono text-gray-800 hover:bg-muted-foreground/10 group-hover:text-foreground';

    return (
        <Card className='group/card w-full max-w-[calc(100vw-64px)] overflow-x-auto sidebar:max-w-[calc(100vw-64px-280px)] lg:col-span-2'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between font-medium  leading-snug text-muted-foreground'>
                    Top posts {getPeriodText(range)}
                </CardTitle>
                <CardDescription className='hidden'>Most viewed posts in this period</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ?
                    <SkeletonTable className='mt-6' />
                    :
                    <>
                        {topPostsData?.stats?.map((post: TopPostViewsStats) => (
                            <div className='group relative flex items-center justify-between gap-5 border-t border-border/50 py-4 before:absolute before:-inset-x-4 before:inset-y-0 before:z-0 before:hidden before:rounded-md before:bg-accent before:opacity-80 before:content-[""] first:!border-border hover:cursor-pointer hover:border-transparent hover:before:block [&+div]:hover:border-transparent' onClick={() => {
                                navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                            }}>
                                <div className='z-10 flex grow items-center gap-4'>
                                    {post.feature_image ?
                                        <div className='hidden aspect-[16/10] w-[100px] shrink-0 rounded-sm bg-cover bg-center sm:!visible sm:!block' style={{
                                            backgroundImage: `url(${post.feature_image})`
                                        }}></div>
                                        :
                                        <FeatureImagePlaceholder className='hidden aspect-[16/10] w-[100px] shrink-0 group-hover:bg-muted-foreground/10 sm:!visible sm:!flex' />
                                    }
                                    <div className='flex flex-col'>
                                        <span className='text-lg font-semibold leading-[1.35em]'>{post.title}</span>
                                        <span className='text-sm text-muted-foreground'>
                                            {/* By {post.authors?.map(author => author.name).join(', ')} &mdash;  */}
                                            {formatDisplayDate(post.published_at)}</span>
                                        <span className='text-sm text-muted-foreground'>Published</span>
                                    </div>
                                </div>
                                <div className='z-10 flex items-center justify-end gap-3 text-sm'>
                                    {showOpenRate && post.open_rate &&
                                        <div className='flex w-[92px]'>
                                            <div className={metricClass}>
                                                <LucideIcon.MailOpen className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                                {post.open_rate ? `${Math.round(post.open_rate)}%` : <>&mdash;</>}
                                            </div>
                                        </div>
                                    }
                                    {showWebAnalytics &&
                                        <div className='flex w-[92px]'>
                                            <div className={metricClass}>
                                                <LucideIcon.Globe className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                                {formatNumber(post.views)}
                                            </div>
                                        </div>
                                    }
                                    <div className='flex w-[66px]'>
                                        <div className={metricClass}>
                                            <LucideIcon.UserPlus className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                            {post.members > 0 ? `+${formatNumber(post.members)}` : '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!topPostsData?.stats || topPostsData.stats.length === 0) && (
                            <TableRow>
                                <TableHead
                                    className='text-center font-normal text-muted-foreground'
                                    colSpan={4}
                                >
                            No data for the selected period
                                </TableHead>
                            </TableRow>
                        )}
                    </>
                }
            </CardContent>
        </Card>
    );
};

export default TopPosts;
