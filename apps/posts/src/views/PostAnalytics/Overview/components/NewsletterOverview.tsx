import React from 'react';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

const NewsletterOverview:React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const {stats, topLinks, isLoading: isNewsletterStatsLoading} = usePostNewsletterStats(postId || '');

    const opensChartData = [
        {opens: stats.opened, openrate: stats.openedRate, fill: 'var(--color-openrate)'}
    ];
    const opensChartConfig = {
        openrate: {
            label: 'Opens',
            color: 'hsl(var(--chart-blue))'
        }
    } satisfies ChartConfig;

    const clicksChartData = [
        {clicks: stats.clicked, clickrate: stats.clickedRate, fill: 'var(--color-clickrate)'}
    ];
    const clickschartConfig = {
        clickrate: {
            label: 'Clicks',
            color: 'hsl(var(--chart-green))'
        }
    } satisfies ChartConfig;

    const radialBarChartClassName = 'mx-auto aspect-square w-full min-h-[200px] max-w-[200px] grow';

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
                    {isNewsletterStatsLoading ?
                        <div className='flex min-h-[250px] items-center justify-center'>
                            <BarChartLoadingIndicator />
                        </div>
                        :
                        <div className='mx-auto flex min-h-[250px] flex-wrap items-center justify-center xl:size-full'>
                            <div className='flex grow flex-col items-center'>
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
                                                                    {formatNumber(opensChartData[0].opens)}
                                                                </tspan>
                                                                <tspan
                                                                    className="text-base font-medium"
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 18}
                                                                >
                                                                    {formatPercentage(opensChartData[0].openrate)}
                                                                </tspan>
                                                            </text>
                                                        );
                                                    }
                                                }}
                                            />
                                        </Recharts.PolarRadiusAxis>
                                    </Recharts.RadialBarChart>
                                </ChartContainer>
                                <div className='-mt-2 flex items-center gap-1.5 font-medium text-muted-foreground'>
                                    <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                                Opened
                                </div>
                            </div>

                            <div className='flex grow flex-col items-center'>
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
                                                                    {formatNumber(clicksChartData[0].clicks)}
                                                                </tspan>
                                                                <tspan
                                                                    className="text-base font-medium"
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 18}
                                                                >
                                                                    {formatPercentage(clicksChartData[0].clickrate)}
                                                                </tspan>
                                                            </text>
                                                        );
                                                    }
                                                }}
                                            />
                                        </Recharts.PolarRadiusAxis>
                                    </Recharts.RadialBarChart>
                                </ChartContainer>
                                <div className='-mt-2 flex items-center gap-1.5 font-medium text-muted-foreground'>
                                    <LucideIcon.MousePointerClick size={16} strokeWidth={1.5} />
                                Clicked
                                </div>
                            </div>
                        </div>
                    }
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
                    <Separator />
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-full' colSpan={2}>
                                        <div className='flex items-center justify-between gap-6'>
                                            <span>Link</span>
                                            <span>No. of members clicked</span>
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            {topLinks.length > 0
                                ?
                                <TableBody>
                                    {topLinks.slice(0, 5).map((row) => {
                                        return (
                                            <TableRow key={row.link.link_id}>
                                                <TableCell className='max-w-0 group-hover:!bg-transparent'>
                                                    <a
                                                        className='block truncate font-medium hover:underline'
                                                        href={row.link.to}
                                                        rel="noreferrer"
                                                        target='_blank'
                                                        title={row.link.title}
                                                    >
                                                        {row.link.title}
                                                    </a>
                                                </TableCell>
                                                <TableCell className='w-[10%] text-right font-mono text-sm group-hover:!bg-transparent'>{formatNumber(row.count)}</TableCell>
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