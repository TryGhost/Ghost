import React, {useMemo} from 'react';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, ChartConfig, HTable, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Separator, Table, TableBody, TableCell, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
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
        <Card className='group/card'>
            <div className='relative flex items-center justify-between gap-6'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-1.5 text-lg'>
                        <LucideIcon.Mail size={16} strokeWidth={1.5} />
                        Newsletter performance
                    </CardTitle>
                </CardHeader>
                <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:opacity-100' size='sm' variant='outline' onClick={() => {
                    navigate(`/analytics/beta/${postId}/newsletter`);
                }}>View more</Button>
            </div>
            {isNewsletterStatsLoading ?
                <CardContent>
                    <div className='mx-auto flex min-h-[250px] items-center justify-center xl:size-full'>
                        <BarChartLoadingIndicator />
                    </div>
                </CardContent>
                :
                <CardContent>
                    <div className='grid grid-cols-2 gap-6'>
                        <KpiCardHeader className='group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0'>
                            <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                                <KpiCardHeaderLabel color='hsl(var(--chart-blue))'>
                                    Open rate
                                </KpiCardHeaderLabel>
                                <KpiCardHeaderValue
                                    // diffDirection={'up'}
                                    // diffTooltip={'Better than the average'}
                                    // diffValue={1.45}
                                    value={formatPercentage(stats.openedRate)}
                                />
                            </div>
                        </KpiCardHeader>
                        <KpiCardHeader className='group relative flex grow flex-row items-start justify-between gap-5 border-none px-0 pt-0'>
                            <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                                <KpiCardHeaderLabel color='hsl(var(--chart-teal))'>
                                    Click rate
                                </KpiCardHeaderLabel>
                                <KpiCardHeaderValue
                                    // diffDirection={'up'}
                                    // diffTooltip={'Better than the average'}
                                    // diffValue={1.45}
                                    value={formatPercentage(stats.clickedRate)}
                                />
                            </div>

                        </KpiCardHeader>
                    </div>
                    <Separator />
                    <div className='mx-auto my-6 h-[240px]'>
                        <NewsletterRadialChart
                            className='pointer-events-none aspect-square h-[240px]'
                            config={commonChartConfig}
                            data={commonChartData}
                            tooltip={false}
                        />
                    </div>
                    <Separator />
                    <div className='pt-3'>
                        <div className='flex items-center justify-between gap-3 py-3'>
                            <span className='font-medium text-muted-foreground'>Top clicked links in this email</span>
                            <HTable>Members</HTable>
                        </div>
                        <Table>
                            {topLinks.length > 0
                                ?
                                <TableBody>
                                    {topLinks.slice(0, 3).map((link) => {
                                        return (
                                            <TableRow key={link.link.link_id} className='border-none'>
                                                <TableCell className='max-w-0 px-0 group-hover:!bg-transparent'>
                                                    <a
                                                        className='block truncate hover:underline'
                                                        href={link.link.to}
                                                        rel="noreferrer"
                                                        target='_blank'
                                                        title={link.link.to}
                                                    >
                                                        {cleanTrackedUrl(link.link.to, true)}
                                                    </a>
                                                </TableCell>
                                                <TableCell className='w-[10%] pl-3 pr-0 text-right font-mono text-sm group-hover:!bg-transparent'>{formatNumber(link.count || 0)}</TableCell>
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
                    {/* <Button variant='outline' onClick={() => {
                        navigate(`/analytics/beta/${postId}/newsletter`);
                    }}>
                        View all
                        <LucideIcon.ArrowRight />
                    </Button> */}
                </CardContent>
            }
        </Card>
    );
};

export default NewsletterOverview;