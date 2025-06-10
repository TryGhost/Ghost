import FeatureImagePlaceholder from '../../components/FeatureImagePlaceholder';
import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber} from '@tryghost/shade';
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

    if (isLoading) {
        return (
            <div>Loading...</div>
        );
    }

    return (
        <Card className='group/card lg:col-span-2'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between leading-snug'>
                    Top posts {getPeriodText(range)}
                    {/* <Button className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100' variant='outline'>
                        View all
                        <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                    </Button> */}
                </CardTitle>
                <CardDescription className='hidden'>Most viewed posts in this period</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className='border-b !border-border'>
                            <TableHead>Post title</TableHead>
                            <TableHead className='text-right'>Visitors</TableHead>
                            <TableHead className='whitespace-nowrap text-right'>Open rate</TableHead>
                            <TableHead className='text-right'>Members</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topPostsData?.stats?.map((post: TopPostViewsStats) => (
                            <TableRow key={post.post_id} className='border-t-0 hover:cursor-pointer' onClick={() => {
                                navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                            }}>
                                <TableCell className='font-'>
                                    <div className='flex items-center gap-4'>
                                        {post.feature_image ?
                                            <div className='aspect-[4/3] w-20 shrink-0 rounded-md bg-cover bg-center' style={{
                                                backgroundImage: `url(${post.feature_image})`
                                            }}></div>
                                            :
                                            <FeatureImagePlaceholder className='aspect-[4/3] w-20 shrink-0' />
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
                </Table>
            </CardContent>
        </Card>
    );
};

export default TopPosts;
