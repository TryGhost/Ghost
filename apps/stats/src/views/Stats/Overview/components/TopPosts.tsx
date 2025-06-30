import FeatureImagePlaceholder from '../../components/FeatureImagePlaceholder';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, SkeletonTable, TableHead, TableRow, abbreviateNumber, cn, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {TopPostViewsStats} from '@tryghost/admin-x-framework/api/stats';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useAppContext, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface PostlistTooptipProps {
    title?: string;
    metrics?: Array<{
        icon?: React.ReactNode;
        label: string;
        metric: React.ReactNode;
    }>
    className?: string;
};

const PostListTooltip:React.FC<PostlistTooptipProps> = ({
    className,
    metrics,
    title
}) => {
    return (
        <>
            <div className={
                cn('pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 z-50 min-w-[160px] -translate-x-1/2 rounded-md bg-background p-3 text-sm opacity-0 shadow-md transition-all group-hover/tooltip:bottom-[calc(100%+12px)] group-hover/tooltip:opacity-100', className)
            }>
                <div className='mb-1.5 whitespace-nowrap border-b pb-1.5 pr-10 font-medium text-muted-foreground'>{title}</div>
                <div className="flex flex-col gap-1.5">
                    {metrics?.map(metric => (
                        <div key={metric.label} className="flex items-center justify-between gap-5">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                {metric.icon}
                                {metric.label}
                            </div>
                            <span className='font-mono'>{metric.metric}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

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
        <Card className='group/card w-full lg:col-span-2'>
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
                        {
                            topPostsData?.stats?.map((post: TopPostViewsStats) => {
                                return (
                                    <div className='group relative flex w-full items-start justify-between gap-5 border-t border-border/50 py-4 before:absolute before:-inset-x-4 before:inset-y-0 before:z-0 before:hidden before:rounded-md before:bg-accent before:opacity-80 before:content-[""] first:!border-border hover:cursor-pointer hover:border-transparent hover:before:block md:items-center dark:before:bg-accent/50 [&+div]:hover:border-transparent' onClick={() => {
                                        navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                                    }}>
                                        <div className='z-10 flex min-w-[160px] grow items-start gap-4 md:items-center lg:min-w-[320px]'>
                                            {post.feature_image ?
                                                <div className='hidden aspect-[16/10] w-[80px] shrink-0 rounded-sm bg-cover bg-center sm:!visible sm:!block lg:w-[100px]' style={{
                                                    backgroundImage: `url(${post.feature_image})`
                                                }}></div>
                                                :
                                                <FeatureImagePlaceholder className='hidden aspect-[16/10] w-[80px] shrink-0 group-hover:bg-muted-foreground/10 sm:!visible sm:!flex lg:w-[100px]' />
                                            }
                                            <div className='flex flex-col'>
                                                <span className='line-clamp-2 text-lg font-semibold leading-[1.35em]'>{post.title}</span>
                                                <span className='text-sm text-muted-foreground'>
                                                    {/* By {post.authors?.map(author => author.name).join(', ')} &mdash;  */}
                                                    {formatDisplayDate(post.published_at)}</span>
                                                {/* <span className='text-sm text-muted-foreground'>Published</span> */}
                                            </div>
                                        </div>
                                        <div className='z-10 flex flex-col items-end justify-center gap-0.5 text-sm md:flex-row md:items-center md:justify-end md:gap-3'>
                                            {showWebAnalytics &&
                                                <div className='group/tooltip relative flex w-[66px] lg:w-[92px]'>
                                                    <PostListTooltip
                                                        metrics={[
                                                            {
                                                                icon: <LucideIcon.Globe className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Unique visitors',
                                                                metric: formatNumber(post.views)
                                                            }
                                                        ]}
                                                        title='Web traffic'
                                                    />
                                                    <div className={metricClass}>
                                                        <LucideIcon.Globe className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                                        {abbreviateNumber(post.views)}
                                                    </div>
                                                </div>
                                            }
                                            {showOpenRate && post.sent_count !== null &&
                                                <div className='group/tooltip relative flex w-[66px] lg:w-[92px]'>
                                                    <PostListTooltip
                                                        className={`${!appSettings?.analytics.membersTrackSources ? 'left-auto right-0 translate-x-0' : ''}`}
                                                        metrics={[
                                                            {
                                                                icon: <LucideIcon.Send className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Sent',
                                                                metric: formatNumber(post.sent_count || 0)
                                                            },
                                                            {
                                                                icon: <LucideIcon.MailOpen className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Opens',
                                                                metric: formatNumber(post.opened_count || 0)
                                                            },
                                                            {
                                                                icon: <LucideIcon.MousePointer className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Clicks',
                                                                metric: formatNumber(post.clicked_count || 0)
                                                            }
                                                        ]}
                                                        title='Newsletter performance'
                                                    />
                                                    <div className={metricClass}>
                                                        <LucideIcon.MailOpen className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                                        {post.open_rate ? `${Math.round(post.open_rate)}%` : <>0</>}
                                                    </div>
                                                </div>
                                            }
                                            {appSettings?.analytics.membersTrackSources &&
                                                <div className='group/tooltip relative flex w-[66px] lg:w-[92px]'>
                                                    <PostListTooltip
                                                        className='left-auto right-0 translate-x-0'
                                                        metrics={[
                                                            {
                                                                icon: <LucideIcon.User className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Free members',
                                                                metric: post.free_members > 0 ? `+${formatNumber(post.free_members)}` : '0'
                                                            },
                                                            {
                                                                icon: <LucideIcon.CreditCard className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />,
                                                                label: 'Paid members',
                                                                metric: post.paid_members > 0 ? `+${formatNumber(post.paid_members)}` : '0'
                                                            }
                                                        ]}
                                                        title='New members'
                                                    />
                                                    <div className={metricClass}>
                                                        <LucideIcon.UserPlus className='text-muted-foreground group-hover:text-foreground' size={16} strokeWidth={1.5} />
                                                        {post.members > 0 ? `+${formatNumber(post.members)}` : '0'}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    </div>
                                );
                            })
                        }
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
