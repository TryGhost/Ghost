import React, {useMemo} from 'react';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardHeader, CardTitle, ChartConfig, DataList, DataListBar, DataListBody, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HTable, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Separator, formatNumber, formatPercentage} from '@tryghost/shade';
import {NewsletterRadialChart, NewsletterRadialChartData} from '../../Newsletter/components/NewsLetterRadialChart';
import {Post} from '@tryghost/admin-x-framework/api/posts';
import {cleanTrackedUrl, processAndGroupTopLinks} from '@src/utils/link-helpers';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';

interface NewsletterOverviewProps {
    post: Post;
    isNewsletterStatsLoading: boolean;
    isWebShown?: boolean;
}

const NewsletterOverview: React.FC<NewsletterOverviewProps> = ({post, isNewsletterStatsLoading, isWebShown}) => {
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

    const fullWidth = post.email_only || !isWebShown;

    return (
        <Card className={`group/datalist overflow-hidden ${fullWidth && 'col-span-2'}`}>
            <div className='relative flex items-center justify-between gap-6'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-1.5 text-lg'>
                        <LucideIcon.Mail size={16} strokeWidth={1.5} />
                        Newsletter performance
                    </CardTitle>
                </CardHeader>
                <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-300 group-hover/datalist:translate-x-0 group-hover/datalist:opacity-100' size='sm' variant='outline' onClick={() => {
                    navigate(`/posts/analytics/${postId}/newsletter`);
                }}>View more</Button>
            </div>
            {isNewsletterStatsLoading ?
                <CardContent>
                    <div className='mx-auto flex min-h-[250px] items-center justify-center xl:size-full'>
                        <BarChartLoadingIndicator />
                    </div>
                </CardContent>
                :
                <CardContent className={`${fullWidth && 'grid grid-cols-2'}`}>
                    <div className={`${fullWidth && 'border-r pr-6'}`}>
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
                        {!fullWidth && <Separator />}
                        <div className='mx-auto my-6 h-[240px]'>
                            <NewsletterRadialChart
                                className='pointer-events-none aspect-square h-[240px]'
                                config={commonChartConfig}
                                data={commonChartData}
                                tooltip={false}
                            />
                        </div>
                    </div>

                    <div className={`${fullWidth && 'pl-6'}`}>
                        {!fullWidth && <Separator />}
                        <div className={fullWidth ? '' : 'pt-3'}>
                            <div className={`flex items-center justify-between gap-3 ${fullWidth ? 'pb-3' : 'py-3'}`}>
                                <span className='font-medium text-muted-foreground'>Top clicked links in this email</span>
                                <HTable>Members</HTable>
                            </div>

                            {topLinks.length > 0
                                ?
                                <DataList className="">
                                    <DataListBody>
                                        {topLinks.slice(0, (fullWidth ? 10 : 5)).map((link) => {
                                            const percentage = stats.clicked > 0 ? link.count / stats.clicked : 0;
                                            return (
                                                <DataListRow key={link.link.link_id}>
                                                    <DataListBar style={{
                                                        width: `${percentage ? Math.round(percentage * 100) : 0}%`
                                                    }} />
                                                    <DataListItemContent>
                                                        <div className="flex items-center space-x-2 overflow-hidden">
                                                            <LucideIcon.Link className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />
                                                            <a className="block truncate font-medium hover:underline"
                                                                href={link.link.to}
                                                                rel="noreferrer"
                                                                target='_blank'
                                                                title={link.link.to}>
                                                                {cleanTrackedUrl(link.link.to, true)}
                                                            </a>
                                                        </div>
                                                    </DataListItemContent>
                                                    <DataListItemValue>
                                                        <DataListItemValueAbs>{formatNumber(link.count || 0)}</DataListItemValueAbs>
                                                        <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                                    </DataListItemValue>
                                                </DataListRow>
                                            );
                                        })}
                                    </DataListBody>
                                </DataList>
                                :
                                <div className='py-20 text-center text-sm text-gray-700'>
                                    You have no links in your post.
                                </div>
                            }
                        </div>
                    </div>
                    {/* <Button variant='outline' onClick={() => {
                        navigate(`/posts/analytics/${postId}/newsletter`);
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