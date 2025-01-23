import type {Meta} from '@storybook/react';
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from './chart';
import React from 'react';
import {Label, Pie, PieChart} from 'recharts';

const meta = {
    title: 'Components / Charts',
    component: ChartContainer,
    tags: ['autodocs'],
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
                color: 'hsl(var(--chart-1))'
            },
            safari: {
                label: 'Less like this',
                color: 'hsl(var(--chart-5))'
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