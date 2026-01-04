import type {Meta} from '@storybook/react-vite';
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from './chart';
import React from 'react';
import {Label, Pie, PieChart, Bar, BarChart, XAxis, YAxis, Line, LineChart} from 'recharts';

const meta = {
    title: 'Components / Charts',
    component: ChartContainer,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Chart components built on ShadCN/UI and Recharts for data visualization. Provides consistent theming and responsive containers for various chart types including pie, bar, and line charts.'
            }
        }
    },
    argTypes: {
        children: {
            control: false
        }
    }
} satisfies Meta<typeof ChartContainer>;

export default meta;

export const Default = {
    render: function ChartStory() {
        const chartData = React.useMemo(() => {
            return [
                {browser: 'chrome', visitors: 98, fill: 'var(--color-chrome)'},
                {browser: 'safari', visitors: 17, fill: 'var(--color-safari)'}
            ];
        }, []);

        const chartConfig = {
            visitors: {
                label: 'Reactions'
            },
            chrome: {
                label: 'More like this',
                color: 'hsl(var(--chart-blue))'
            },
            safari: {
                label: 'Less like this',
                color: 'hsl(var(--chart-orange))'
            }
        } satisfies ChartConfig;

        const totalVisitors = React.useMemo(() => {
            return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
        }, [chartData]);

        return (
            <>
                <ChartContainer
                    className="mx-auto aspect-square h-[250px] min-h-[250px] w-full"
                    config={chartConfig}
                >
                    <PieChart>
                        <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                            cursor={false}
                        />
                        <Pie
                            data={chartData}
                            dataKey="visitors"
                            innerRadius={60}
                            nameKey="browser"
                            strokeWidth={5}
                        >
                            <Label
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
                                                    className="fill-foreground text-2xl font-semibold tracking-tight"
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                >
                                                    {totalVisitors.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    className="fill-muted-foreground"
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 20}
                                                >
                                                    Reactions
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className='text-center'>
                    Visit <a className="underline" href="https://ui.shadcn.com/docs/components/chart" rel="noreferrer" target="_blank">ShadCN/UI Charts docs</a> for usage details.
                </div>
            </>
        );
    }
};

export const BarChartExample = {
    render: function BarChartStory() {
        const chartData = [
            {month: 'January', visitors: 186},
            {month: 'February', visitors: 305},
            {month: 'March', visitors: 237},
            {month: 'April', visitors: 273},
            {month: 'May', visitors: 209},
            {month: 'June', visitors: 214}
        ];

        const chartConfig = {
            visitors: {
                label: 'Visitors',
                color: 'hsl(var(--chart-blue))'
            }
        } satisfies ChartConfig;

        return (
            <ChartContainer className="h-[200px]" config={chartConfig}>
                <BarChart data={chartData}>
                    <XAxis dataKey="month" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
                </BarChart>
            </ChartContainer>
        );
    }
};

export const LineChartExample = {
    render: function LineChartStory() {
        const chartData = [
            {month: 'Jan', revenue: 2400},
            {month: 'Feb', revenue: 1398},
            {month: 'Mar', revenue: 9800},
            {month: 'Apr', revenue: 3908},
            {month: 'May', revenue: 4800},
            {month: 'Jun', revenue: 3800}
        ];

        const chartConfig = {
            revenue: {
                label: 'Revenue',
                color: 'hsl(var(--chart-green))'
            }
        } satisfies ChartConfig;

        return (
            <ChartContainer className="h-[200px]" config={chartConfig}>
                <LineChart data={chartData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                        dataKey="revenue"
                        dot={false}
                        stroke="var(--color-revenue)" 
                        strokeWidth={2}
                        type="monotone"
                    />
                </LineChart>
            </ChartContainer>
        );
    }
};