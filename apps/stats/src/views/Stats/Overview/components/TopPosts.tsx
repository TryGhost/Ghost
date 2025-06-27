import FeatureImagePlaceholder from '../../components/FeatureImagePlaceholder';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber} from '@tryghost/shade';
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

    return (
        <Card className='group/card w-full max-w-[calc(100vw-64px)] overflow-x-auto sidebar:max-w-[calc(100vw-64px-280px)] lg:col-span-2'>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='min-w-[360px]' variant='cardhead'>
                                <CardHeader>
                                    <CardTitle className='flex items-baseline justify-between leading-snug  text-muted-foreground'>
                                        Top posts {getPeriodText(range)}
                                    </CardTitle>
                                    <CardDescription className='hidden'>Most viewed posts in this period</CardDescription>
                                </CardHeader>
                            </TableHead>
                            {showWebAnalytics &&
                                <TableHead className='w-[12%] text-right'>Visitors</TableHead>
                            }
                            {showOpenRate &&
                                <TableHead className='w-[12%] whitespace-nowrap text-right'>Open rate</TableHead>
                            }
                            <TableHead className='w-[12%] text-right'>Members</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ?
                            Array.from({length: 5}, (_, i) => (
                                <TableRow key={i} className='border-none hover:bg-transparent'>
                                    <TableCell className='group-hover:bg-transparent'>
                                        <div className='flex w-full items-center gap-4'>
                                            <Skeleton className='aspect-[16/10] w-24 rounded-sm sm:!visible sm:!block' />
                                            <div className='flex w-full flex-col'>
                                                <Skeleton className='w-2/3' />
                                                <Skeleton className='w-20' />
                                            </div>
                                        </div>
                                    </TableCell>
                                    {showWebAnalytics &&
                                    <TableCell className='w-[12%] group-hover:bg-transparent'><Skeleton /></TableCell>
                                    }
                                    {showOpenRate &&
                                    <TableCell className='w-[12%] group-hover:bg-transparent'><Skeleton /></TableCell>
                                    }
                                    <TableCell className='w-[12%] group-hover:bg-transparent'><Skeleton /></TableCell>
                                </TableRow>
                            ))
                            :
                            <>
                                <TableRow className='border-none'>
                                    <TableCell className='pointer-events-none !h-2 !p-0' colSpan={4}></TableCell>
                                </TableRow>
                                {topPostsData?.stats?.map((post: TopPostViewsStats) => (
                                    <TableRow key={post.post_id} className='border-none hover:cursor-pointer' onClick={() => {
                                        navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                                    }}>
                                        <TableCell>
                                            <div className='flex items-center gap-4'>
                                                {post.feature_image ?
                                                    <div className='hidden aspect-[16/10] w-24 shrink-0 rounded-sm bg-cover bg-center sm:!visible sm:!block' style={{
                                                        backgroundImage: `url(${post.feature_image})`
                                                    }}></div>
                                                    :
                                                    <FeatureImagePlaceholder className='hidden aspect-[16/10] w-24 shrink-0 sm:!visible sm:!flex' />
                                                }
                                                <div className='flex flex-col'>
                                                    <span className='text-base font-semibold leading-[1.35em]'>{post.title}</span>
                                                    <span className='text-sm text-muted-foreground'>{formatDisplayDate(post.published_at)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {showWebAnalytics &&
                                        <TableCell className='text-right font-mono'>
                                            {formatNumber(post.views)}
                                        </TableCell>
                                        }
                                        {showOpenRate &&
                                        <TableCell className='text-right font-mono'>
                                            {post.open_rate ? `${Math.round(post.open_rate)}%` : <>&mdash;</>}
                                        </TableCell>
                                        }
                                        <TableCell className='text-right font-mono'>
                                            {post.members > 0 ? `+${formatNumber(post.members)}` : '0'}
                                        </TableCell>
                                    </TableRow>
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
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default TopPosts;
