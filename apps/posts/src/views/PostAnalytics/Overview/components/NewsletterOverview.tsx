import React from 'react';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, LucideIcon, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

const NewsletterOverview:React.FC = () => {
    const {postId} = useParams();
    const {stats, topLinks, isLoading: isNewsletterStatsLoading} = usePostNewsletterStats(postId || '', '5');

    const opensChartData = [
        {opens: Number((stats?.opened && stats?.sent ? (stats.opened / stats.sent) : 0).toFixed(2)), fill: 'var(--color-opens)'}
    ];
    const opensChartConfig = {
        opens: {
            label: 'Opens',
            color: 'hsl(var(--chart-blue))'
        }
    } satisfies ChartConfig;

    const clicksChartData = [
        {clicks: Number((stats?.clicked && stats?.sent ? (stats.clicked / stats.sent) : 0).toFixed(2)), fill: 'var(--color-clicks)'}
    ];
    const clickschartConfig = {
        clicks: {
            label: 'Clicks',
            color: 'hsl(var(--chart-green))'
        }
    } satisfies ChartConfig;

    const radialBarChartClassName = 'mx-auto aspect-square w-full min-h-[200px] max-w-[200px]';

    return (
        <>
            {isNewsletterStatsLoading ?
                <div className='flex min-h-[250px] items-center justify-center'>
                    <BarChartLoadingIndicator />
                </div>
                :
                <div className='grid grid-cols-1 items-start gap-8 pt-6 xl:grid-cols-2'>
                    <div className='mx-auto flex min-h-[250px] flex-wrap items-center justify-center gap-10 xl:size-full xl:gap-0'>
                        <ChartContainer
                            className={radialBarChartClassName}
                            config={opensChartConfig}
                        >
                            <Recharts.RadialBarChart
                                data={opensChartData}
                                endAngle={stats?.opened > 0 ? -270 : 270}
                                innerRadius={72}
                                outerRadius={110}
                                startAngle={stats?.opened > 0 ? 90 : -90}
                            >
                                <Recharts.PolarGrid
                                    className="first:fill-muted last:fill-background"
                                    gridType="circle"
                                    polarRadius={[80, 64]}
                                    radialLines={false}
                                    stroke="none"
                                />
                                <Recharts.RadialBar cornerRadius={10} dataKey="opens" minPointSize={-2} background />
                                <Recharts.PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
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
                                                            className="fill-foreground text-[2.6rem] font-semibold tracking-tight"
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                        >
                                                            {formatPercentage(opensChartData[0].opens)}
                                                        </tspan>
                                                        <tspan
                                                            className="fill-muted-foreground font-medium"
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy || 0) + 24}
                                                        >
                                                        Opens
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Recharts.PolarRadiusAxis>
                            </Recharts.RadialBarChart>
                        </ChartContainer>

                        <ChartContainer
                            className={radialBarChartClassName}
                            config={clickschartConfig}
                        >
                            <Recharts.RadialBarChart
                                data={clicksChartData}
                                endAngle={stats?.clicked > 0 ? -270 : 270}
                                innerRadius={72}
                                outerRadius={110}
                                startAngle={stats?.clicked > 0 ? 90 : -90}
                            >
                                <Recharts.PolarGrid
                                    className="first:fill-muted last:fill-background"
                                    gridType="circle"
                                    polarRadius={[80, 64]}
                                    radialLines={false}
                                    stroke="none"
                                />
                                <Recharts.RadialBar cornerRadius={10} dataKey="clicks" minPointSize={-2} background />
                                <Recharts.PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
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
                                                            className="fill-foreground text-[2.6rem] font-semibold tracking-tight"
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                        >
                                                            {formatPercentage(clicksChartData[0].clicks)}
                                                        </tspan>
                                                        <tspan
                                                            className="fill-muted-foreground font-medium"
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy || 0) + 24}
                                                        >
                                                        Clicks
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Recharts.PolarRadiusAxis>
                            </Recharts.RadialBarChart>
                        </ChartContainer>
                    </div>
                    <div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-full' colSpan={2}>
                                        <div className='flex items-center justify-between gap-6'>
                                            <div className='flex items-center gap-1.5'>
                                                <LucideIcon.Link size={16} strokeWidth={1.25}/>
                                                    Top links
                                            </div>
                                                No. of members clicked
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            {topLinks.length > 0
                                ?
                                <TableBody>
                                    {topLinks.map((row) => {
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
                </div>
            }
        </>
    );
};

export default NewsletterOverview;