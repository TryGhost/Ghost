import {calculateYAxisWidth, cn, formatDisplayDateWithRange, formatNumber, getYRange} from '@/lib/utils';
import React from 'react';
import {AlignedAxisTick, ChartConfig, ChartContainer, ChartTooltip} from './chart';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';

// A Ghost specific charts for analytics re-using ShadCN/UI and Recharts components

interface TooltipPayload {
    value: number;
    payload: {
        date?: string;
        formattedValue?: string;
        label?: string;
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

    const {date, formattedValue, label} = payload[0].payload;
    const displayValue = formattedValue || payload[0].value;

    return (
        <div className="min-w-[120px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0)}</div>}
            <div className='flex items-center gap-2'>
                <span className='inline-block size-[9px] rounded-[2px] opacity-50' style={{backgroundColor: color || 'hsl(var(--chart-1))'}}></span>
                <div className='flex grow items-center justify-between gap-3'>
                    {label && <div className="text-sm text-muted-foreground">{label}</div>}
                    <div className="font-mono font-medium">{displayValue}</div>
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

    return (
        <ChartContainer className={
            cn('w-full', className)
        } config={chartConfig}>
            <AreaChart
                data={data}
                margin={{
                    left: 4,
                    right: 4,
                    top: 4
                }}
                syncId={syncId}
            >
                <CartesianGrid horizontal={false} vertical={false} />
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
                    ticks={yRange}
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
                    strokeWidth={2}
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