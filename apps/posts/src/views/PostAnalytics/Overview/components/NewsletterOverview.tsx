import React, {useMemo} from 'react';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, formatNumber, formatPercentage} from '@tryghost/shade';
import {Post} from '@tryghost/admin-x-framework/api/posts';
import {cleanTrackedUrl} from '@src/utils/link-helpers';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';

interface NewsletterOverviewProps {
    post: Post;
}

const NewsletterOverview: React.FC<NewsletterOverviewProps> = ({post}) => {
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
            clickedRate: sent > 0 ? clicked / sent : 0
        };
    }, [post]);

    // Get top links for this post
    const {data: linksResponse} = useTopLinks({
        searchParams: {
            filter: `post_id:'${postId}'`
        }
    });

    const topLinks = useMemo(() => {
        return linksResponse?.links || [];
    }, [linksResponse]);

    const opensChartData = [
        {opens: stats.opened, openrate: stats.openedRate, fill: 'url(#gradientBlue)'}
    ];
    const opensChartConfig = {
        openrate: {
            label: 'Opens',
            color: 'hsl(var(--chart-blue))'
        }
    } satisfies ChartConfig;

    const clicksChartData = [
        {clicks: stats.clicked, clickrate: stats.clickedRate, fill: 'url(#gradientTeal)'}
    ];
    const clickschartConfig = {
        clickrate: {
            label: 'Clicks',
            color: 'hsl(var(--chart-teal))'
        }
    } satisfies ChartConfig;

    const radialBarChartClassName = cn('mx-auto aspect-square w-full min-h-[200px] max-w-[200px] grow pointer-events-none');

    return (
        <div className='grid grid-cols-1 gap-8 xl:grid-cols-2'>
            <Card className='group/card'>
                <div className='flex items-center justify-between gap-6'>
                    <CardHeader>
                        <CardTitle>Newsletter performance</CardTitle>
                        <CardDescription>How members interacted with this email</CardDescription>
                    </CardHeader>
                    <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                        navigate(`/analytics/beta/${postId}/newsletter`);
                    }}>
                    View more
                        <LucideIcon.ArrowRight />
                    </Button>
                </div>
                <CardContent>
                    <Separator />
                    <div className='mx-auto flex min-h-[250px] flex-wrap items-stretch justify-center xl:size-full'>
                        <div className='group flex grow flex-col items-center rounded-md p-4 transition-all hover:!cursor-pointer' onClick={() => {
                            navigate(`/analytics/beta/${postId}/newsletter`);
                        }}>
                            <ChartContainer
                                className={radialBarChartClassName}
                                config={opensChartConfig}
                            >
                                <Recharts.RadialBarChart
                                    data={opensChartData}
                                    endAngle={-270}
                                    innerRadius={72}
                                    outerRadius={110}
                                    startAngle={90}
                                >
                                    <defs>
                                        <radialGradient cx="30%" cy="30%" id="gradientBlue" r="70%">
                                            <stop offset="0%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.5} />
                                            <stop offset="100%" stopColor="hsl(var(--chart-blue))" stopOpacity={1} />
                                        </radialGradient>
                                    </defs>
                                    <Recharts.RadialBar
                                        cornerRadius={10}
                                        dataKey="openrate"
                                        minPointSize={-2}
                                        background />
                                    <Recharts.PolarAngleAxis
                                        angleAxisId={0}
                                        domain={[0, 1]}
                                        tick={false}
                                        type="number"
                                    />
                                    <Recharts.PolarRadiusAxis axisLine={false} domain={[0, 1]} tick={false} tickLine={false} type="number">
                                        <Recharts.Label
                                            content={({viewBox}) => {
                                                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                    return (
                                                        <text
                                                            dominantBaseline="middle"
                                                            textAnchor="middle"
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                        >
                                                            <tspan
                                                                className="fill-foreground text-[2.0rem] font-semibold tracking-tight"
                                                                x={viewBox.cx}
                                                                y={(viewBox.cy || 0) - 4}
                                                            >
                                                                {formatPercentage(opensChartData[0].openrate)}
                                                            </tspan>
                                                            <tspan
                                                                className="text-base font-medium"
                                                                x={viewBox.cx}
                                                                y={(viewBox.cy || 0) + 18}
                                                            >
                                                                {formatNumber(opensChartData[0].opens)}
                                                            </tspan>
                                                        </text>
                                                    );
                                                }
                                            }}
                                        />
                                    </Recharts.PolarRadiusAxis>
                                </Recharts.RadialBarChart>
                            </ChartContainer>
                            <div className='-mt-2 flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                            Opened
                            </div>
                        </div>

                        <div className='group flex grow flex-col items-center rounded-md p-4 transition-all hover:!cursor-pointer' onClick={() => {
                            navigate(`/analytics/beta/${postId}/newsletter`);
                        }}>
                            <ChartContainer
                                className={radialBarChartClassName}
                                config={clickschartConfig}
                            >
                                <Recharts.RadialBarChart
                                    data={clicksChartData}
                                    endAngle={-270}
                                    innerRadius={72}
                                    outerRadius={110}
                                    startAngle={90}
                                >
                                    <defs>
                                        <radialGradient cx="30%" cy="30%" id="gradientTeal" r="70%">
                                            <stop offset="0%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.5} />
                                            <stop offset="100%" stopColor="hsl(var(--chart-teal))" stopOpacity={1} />
                                        </radialGradient>
                                    </defs>
                                    <Recharts.RadialBar
                                        cornerRadius={10}
                                        dataKey="clickrate"
                                        minPointSize={-2}
                                        background
                                    />
                                    <Recharts.PolarAngleAxis
                                        angleAxisId={0}
                                        domain={[0, 1]}
                                        tick={false}
                                        type="number"
                                    />
                                    <Recharts.PolarRadiusAxis axisLine={false} domain={[0, 1]} tick={false} tickLine={false}>
                                        <Recharts.Label
                                            content={({viewBox}) => {
                                                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                    return (
                                                        <text
                                                            dominantBaseline="middle"
                                                            textAnchor="middle"
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                        >
                                                            <tspan
                                                                className="fill-foreground text-[2.0rem] font-semibold tracking-tight"
                                                                x={viewBox.cx}
                                                                y={(viewBox.cy || 0) - 4}
                                                            >
                                                                {formatPercentage(clicksChartData[0].clickrate)}
                                                            </tspan>
                                                            <tspan
                                                                className="text-base font-medium"
                                                                x={viewBox.cx}
                                                                y={(viewBox.cy || 0) + 18}
                                                            >
                                                                {formatNumber(clicksChartData[0].clicks)}
                                                            </tspan>
                                                        </text>
                                                    );
                                                }
                                            }}
                                        />
                                    </Recharts.PolarRadiusAxis>
                                </Recharts.RadialBarChart>
                            </ChartContainer>
                            <div className='-mt-2 flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                <LucideIcon.MousePointerClick size={16} strokeWidth={1.5} />
                            Clicked
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className='group/card'>
                <div className='flex items-center justify-between gap-6'>
                    <CardHeader>
                        <CardTitle>Top links</CardTitle>
                        <CardDescription>Links in your newsletter people clicked on the most</CardDescription>
                    </CardHeader>
                    <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                        navigate(`/analytics/beta/${postId}/newsletter`);
                    }}>
                    View more
                        <LucideIcon.ArrowRight />
                    </Button>
                </div>
                <CardContent>
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow className='border-b !border-border'>
                                    <TableHead className='w-full' colSpan={2}>
                                        <div className='flex items-center justify-between gap-6'>
                                            <span>Link</span>
                                            <span>No. of members</span>
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
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
                                                <TableCell className='w-[10%] py-2.5 text-right font-mono text-sm group-hover:!bg-transparent'>{formatNumber(link.count?.clicks || 0)}</TableCell>
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
            </Card>
        </div>
    );
};

export default NewsletterOverview;