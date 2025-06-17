import FeatureImagePlaceholder from '../../components/FeatureImagePlaceholder';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {TopPostViewsStats} from '@tryghost/admin-x-framework/api/stats';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';

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

    return (
        <Card className='group/card lg:col-span-2'>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead variant='cardhead'>
                                <CardHeader>
                                    <CardTitle className='flex items-baseline justify-between leading-snug'>
                                        Top posts {getPeriodText(range)}
                                    </CardTitle>
                                    <CardDescription className='hidden'>Most viewed posts in this period</CardDescription>
                                </CardHeader>
                            </TableHead>
                            <TableHead className='w-[92px] text-right'>Visitors</TableHead>
                            <TableHead className='w-[92px] whitespace-nowrap text-right'>Open rate</TableHead>
                            <TableHead className='w-[92px] text-right'>Members</TableHead>
                        </TableRow>
                    </TableHeader>
                    {isLoading ?
                        Array.from({length: 5}, (_, i) => (
                            <TableRow key={i} className='border-none hover:bg-transparent'>
                                <TableCell className='group-hover:bg-transparent'>
                                    <div className='flex w-full items-center gap-4'>
                                        <Skeleton className='aspect-[16/10] w-20 rounded-sm' />
                                        <div className='flex w-full flex-col'>
                                            <Skeleton className='w-2/3' />
                                            <Skeleton className='w-20' />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className='w-[10%] group-hover:bg-transparent'><Skeleton /></TableCell>
                                <TableCell className='w-[10%] group-hover:bg-transparent'><Skeleton /></TableCell>
                                <TableCell className='w-[10%] group-hover:bg-transparent'><Skeleton /></TableCell>
                            </TableRow>
                        ))
                        :
                        <TableBody>
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
                                                <div className='aspect-[16/10] w-20 shrink-0 rounded-sm bg-cover bg-center' style={{
                                                    backgroundImage: `url(${post.feature_image})`
                                                }}></div>
                                                :
                                                <FeatureImagePlaceholder className='aspect-[16/10] h-[50px] w-20 shrink-0' />
                                            }
                                            <div className='flex flex-col'>
                                                <span className='font-semibold leading-[1.35em]'>{post.title}</span>
                                                <span className='text-xs text-muted-foreground'>{formatDisplayDate(post.published_at)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-right font-mono'>
                                        {formatNumber(post.views)}
                                    </TableCell>
                                    <TableCell className='text-right font-mono'>
                                        {post.open_rate ? `${Math.round(post.open_rate)}%` : <>&mdash;</>}
                                    </TableCell>
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
                        </TableBody>
                    }
                </Table>
            </CardContent>
        </Card>
    );
};

export default TopPosts;
