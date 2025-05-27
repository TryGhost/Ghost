import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import React from 'react';
import {AlignedAxisTick, ChartConfig, ChartContainer, ChartTooltip, Recharts, cn, formatDisplayDateWithRange, formatNumber, getYRange} from '@tryghost/shade';

export type AreaChartDataItem = {
    date: string;
    value: number;
    formattedValue: string;
    label: string;
}

interface AreaChartProps {
    data: AreaChartDataItem[];
    range: number;
    color?: string;
    id: string;
    className?: string;
}

const AreaChart: React.FC<AreaChartProps> = ({
    data,
    range,
    color = 'hsl(var(--chart-blue))',
    id,
    className
}) => {
    const yRange = [getYRange(data).min, getYRange(data).max];
    const chartConfig = {
        value: {
            label: data[0]?.label || 'Value'
        }
    } satisfies ChartConfig;

    return (
        <ChartContainer className={
            cn('w-full', className)
        } config={chartConfig}>
            <Recharts.AreaChart
                data={data}
                margin={{
                    left: 4,
                    right: 4,
                    top: 0
                }}
            >
                <Recharts.CartesianGrid horizontal={false} vertical={false} />
                <Recharts.XAxis
                    axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                    dataKey="date"
                    interval={0}
                    tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(value, range)} />}
                    tickFormatter={value => formatDisplayDateWithRange(value, range)}
                    tickLine={false}
                    tickMargin={10}
                    ticks={data && data.length > 0 ? [data[0].date, data[data.length - 1].date] : []}
                />
                <Recharts.YAxis
                    axisLine={false}
                    domain={yRange}
                    scale="linear"
                    tickFormatter={(value: number) => {
                        return formatNumber(value);
                    }}
                    tickLine={false}
                    ticks={[]}
                    width={0}
                />
                <ChartTooltip
                    content={<CustomTooltipContent color={color} range={range} />}
                    cursor={true}
                    isAnimationActive={false}
                    position={{y: 10}}
                />
                <defs>
                    <linearGradient id={`fillChart-${id}`} x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset="5%"
                            stopColor={color}
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="95%"
                            stopColor={color}
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                </defs>
                <Recharts.Area
                    dataKey="value"
                    fill={`url(#fillChart-${id})`}
                    fillOpacity={0.2}
                    isAnimationActive={false}
                    stackId="a"
                    stroke={color}
                    strokeWidth={2}
                    type="linear"
                />
            </Recharts.AreaChart>
        </ChartContainer>
    );
};

export default AreaChart;