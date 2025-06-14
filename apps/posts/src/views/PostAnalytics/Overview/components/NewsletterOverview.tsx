import React, {useMemo} from 'react';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, HTable, LucideIcon, Separator, Table, TableBody, TableCell, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {NewsletterRadialChart, NewsletterRadialChartData} from '../../Newsletter/components/NewsLetterRadialChart';
import {Post} from '@tryghost/admin-x-framework/api/posts';
import {cleanTrackedUrl, processAndGroupTopLinks} from '@src/utils/link-helpers';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';

interface NewsletterOverviewProps {
    post: Post;
    isNewsletterStatsLoading: boolean;
}

const NewsletterOverview: React.FC<NewsletterOverviewProps> = ({post, isNewsletterStatsLoading}) => {
    const {postId} = useParams();
    const navigate = useNavigate();

    // Calculate stats from post data
    const stats = useMemo(() => {
        const opened = post.email?.opened_count || 0;
        const sent = post.email?.email_count || 0;
        const clicked = post.count?.clicks || 0;

        return {
            opened,
            clicked,
            openedRate: sent > 0 ? opened / sent : 0,
            clickedRate: sent > 0 ? clicked / sent : 0,
            sent: sent
        };
    }, [post]);

    // Get top links for this post
    const {data: linksResponse} = useTopLinks({
        searchParams: {
            filter: `post_id:'${postId}'`
        }
    });

    const topLinks = useMemo(() => {
        return processAndGroupTopLinks(linksResponse);
    }, [linksResponse]);

    // "Clicked" Chart
    const commonChartData: NewsletterRadialChartData[] = [
        {datatype: 'Clicked', value: stats.clickedRate, fill: 'url(#gradientTeal)', color: 'hsl(var(--chart-teal))'},
        {datatype: 'Opened', value: stats.openedRate, fill: 'url(#gradientBlue)', color: 'hsl(var(--chart-blue))'}
    ];

    const commonChartConfig = {
        percentage: {
            label: 'Opened'
        },
        Average: {
            label: 'Clicked'
        },
        'This newsletter': {
            label: 'Opened'
        }
    } satisfies ChartConfig;

    return (
        <div className='grid grid-cols-1 gap-8 xl:grid-cols-2'>
            <Card className='group/card hover:cursor-pointer' onClick={() => {
                navigate(`/analytics/beta/${postId}/newsletter`);
            }}>
                <div className='flex items-center justify-between gap-6'>
                    <CardHeader>
                        <CardTitle>Newsletter performance</CardTitle>
                        <CardDescription>How members interacted with this email</CardDescription>
                    </CardHeader>
                </div>
                {isNewsletterStatsLoading ?
                    <CardContent>
                        <div className='mx-auto flex min-h-[250px] items-center justify-center xl:size-full'>
                            <BarChartLoadingIndicator />
                        </div>
                    </CardContent>
                    :
                    <CardContent>
                        <Separator />
                        <div className='mx-auto mt-4 h-[240px]'>
                            <NewsletterRadialChart
                                className='pointer-events-none h-[240px]'
                                config={commonChartConfig}
                                data={commonChartData}
                                percentageLabel='Sent'
                                percentageValue={formatNumber(stats.sent)}
                                tooltip={false}
                            />
                        </div>
                        <div className='mt-2 flex items-center justify-center gap-8'>
                            <div className='flex gap-1.5 text-sm text-muted-foreground'>
                                <div className='flex items-center gap-1.5'>
                                    <div className='size-2 rounded-full bg-chart-blue/50'></div>
                                    <span className='font-medium'>Opened</span>
                                </div>
                                <span className='text-lg font-semibold tracking-tighter text-foreground'>{formatPercentage(stats.openedRate)}</span>
                            </div>
                            <div className='flex gap-1.5 text-sm text-muted-foreground'>
                                <div className='flex items-center gap-1.5'>
                                    <div className='size-2 rounded-full bg-chart-teal/50'></div>
                                    <span className='font-medium'>Clicked</span>
                                </div>
                                <span className='text-lg font-semibold tracking-tighter text-foreground'>{formatPercentage(stats.clickedRate)}</span>
                            </div>
                        </div>
                    </CardContent>
                }

            </Card>
            <Card className='group/card'>
                <div className='flex items-center justify-between gap-6 p-6'>
                    <CardHeader className='p-0'>
                        <CardTitle>Top links</CardTitle>
                        <CardDescription>Links in your newsletter people clicked on the most</CardDescription>
                    </CardHeader>
                    <HTable className='mr-2 text-right'>No. of members</HTable>
                </div>
                <CardContent>
                    <Separator />
                    <div className='pt-3'>
                        <Table>
                            {topLinks.length > 0
                                ?
                                <TableBody>
                                    {topLinks.slice(0, 5).map((link) => {
                                        return (
                                            <TableRow key={link.link.link_id} className='border-none'>
                                                <TableCell className='max-w-0 py-2.5 group-hover:!bg-transparent'>
                                                    <a
                                                        className='block truncate font-medium hover:underline'
                                                        href={link.link.to}
                                                        rel="noreferrer"
                                                        target='_blank'
                                                        title={link.link.to}
                                                    >
                                                        {cleanTrackedUrl(link.link.to, true)}
                                                    </a>
                                                </TableCell>
                                                <TableCell className='w-[10%] py-2.5 text-right font-mono text-sm group-hover:!bg-transparent'>{formatNumber(link.count || 0)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                                :
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={2}>
                                            <div className='py-20 text-center text-sm text-gray-700'>
                                                You have no links in your post.
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            }
                        </Table>
                    </div>
                </CardContent>
                {topLinks.length > 0 &&
                <CardFooter>
                    <Button variant='outline' onClick={() => {
                        navigate(`/analytics/beta/${postId}/newsletter`);
                    }}>
                        View all
                        <LucideIcon.ArrowRight />
                    </Button>
                </CardFooter>
                }
            </Card>
        </div>
    );
};

export default NewsletterOverview;