import {calculateYAxisWidth, cn, formatDisplayDateWithRange, formatNumber, getYRange} from '@/lib/utils';
import React from 'react';
import {AlignedAxisTick, ChartConfig, ChartContainer, ChartTooltip} from './chart';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {TrendingDown, TrendingUp} from 'lucide-react';

// A Ghost specific charts for analytics re-using ShadCN/UI and Recharts components

interface TooltipPayload {
    value: number;
    payload: {
        date?: string;
        formattedValue?: string;
        label?: string;
        diffValue?: null | number;
        formattedDiffValue?: null | string;
    };
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    range?: number;
    color?: string;
}

const GhCustomTooltipContent = ({active, payload, range, color}: TooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const {date, formattedValue, label, diffValue, formattedDiffValue} = payload[0].payload;
    const displayValue = formattedValue || payload[0].value;

    return (
        <div className="min-w-[120px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0)}</div>}
            <div className='flex items-start gap-2'>
                <span className='mt-1.5 inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color || 'hsl(var(--chart-blue))'}}></span>
                <div className='flex grow items-start justify-between gap-5'>
                    {label && <div className="text-sm text-muted-foreground">{label}</div>}
                    <div className="flex flex-col items-end font-mono font-medium">
                        {displayValue}

                        {diffValue ? diffValue < 0 && (
                            <div className='flex items-center gap-0.5 text-red-600'>
                                <TrendingDown size={14} strokeWidth={1.5} />
                                <span>{formattedDiffValue}</span>
                            </div>
                        ) : <></>}
                        {diffValue ? diffValue > 0 && (
                            <div className='flex items-center gap-0.5 text-green-600'>
                                <TrendingUp size={14} strokeWidth={1.5} />
                                <span>{formattedDiffValue}</span>
                            </div>
                        ) : <></>}
                        {/* {diffValue !== undefined ? diffValue === 0 && (
                            <span>&mdash;</span>
                        ) : <></>} */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export type GhAreaChartDataItem = {
    date: string;
    value: number;
    formattedValue: string;
    label: string;
}

interface GhAreaChartProps {
    data: GhAreaChartDataItem[];
    range: number;
    yAxisRange?: [number, number],
    color?: string;
    id: string;
    className?: string;
    syncId?: string;
    allowDataOverflow?: boolean;
    showYAxisValues?: boolean;
    showHorizontalLines?: boolean;
    dataFormatter?: (value: number) => string;
}

const GhAreaChart: React.FC<GhAreaChartProps> = ({
    data,
    range,
    yAxisRange,
    color = 'hsl(var(--chart-blue))',
    id,
    className,
    syncId,
    allowDataOverflow = false,
    showYAxisValues = true,
    showHorizontalLines = true,
    dataFormatter = formatNumber
}) => {
    const yRange = yAxisRange || [getYRange(data).min, getYRange(data).max];
    const chartConfig = {
        value: {
            label: data[0]?.label || 'Value'
        }
    } satisfies ChartConfig;

    // Use yRange as domain and set baseValue to the minimum
    const baseValue = yRange[0];

    // Calculate midpoint and create ticks array
    const midValue = (yRange[0] + yRange[1]) / 2;
    const isWholeMid = Number.isInteger(midValue);
    const yTicks = isWholeMid ? [yRange[0], midValue, yRange[1]] : yRange;

    return (
        <ChartContainer className={
            cn('w-full', className)
        } config={chartConfig}>
            <AreaChart
                data={data}
                margin={{
                    left: 4,
                    right: 4,
                    top: showHorizontalLines ? 24 : 4
                }}
                syncId={syncId}
            >
                <CartesianGrid horizontal={showHorizontalLines} vertical={false} />
                <XAxis
                    axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                    dataKey="date"
                    interval={0}
                    tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(String(value), range)} />}
                    tickFormatter={value => formatDisplayDateWithRange(String(value), range)}
                    tickLine={false}
                    tickMargin={10}
                    ticks={data && data.length > 0 ? [data[0].date, data[data.length - 1].date] : []}
                />
                <YAxis
                    allowDataOverflow={allowDataOverflow}
                    axisLine={false}
                    domain={allowDataOverflow ? undefined : yRange}
                    scale="linear"
                    tickFormatter={(value: number) => {
                        return dataFormatter(value);
                    }}
                    tickLine={false}
                    ticks={yTicks}
                    width={showYAxisValues ? calculateYAxisWidth(yRange, dataFormatter) : 0}
                />
                <ChartTooltip
                    content={<GhCustomTooltipContent color={color} range={range} />}
                    cursor={true}
                    isAnimationActive={false}
                    position={{y: 10}}
                />
                <defs>
                    <linearGradient id={`fillChart-${id}`} x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset='5%'
                            stopColor={color}
                            stopOpacity={0.8}
                        />
                        <stop
                            offset='95%'
                            stopColor={color}
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                </defs>
                <Area
                    baseValue={baseValue}
                    dataKey="value"
                    fill={`url(#fillChart-${id})`}
                    fillOpacity={0.2}
                    isAnimationActive={false}
                    stroke={color}
                    strokeWidth={1.5}
                    type="linear"
                />
            </AreaChart>
        </ChartContainer>
    );
};

export {
    GhAreaChart,
    GhCustomTooltipContent
};