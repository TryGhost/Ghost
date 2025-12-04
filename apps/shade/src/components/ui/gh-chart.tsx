import {calculateYAxisWidth, cn, formatDisplayDateWithRange, formatNumber, getYRange} from '@/lib/utils';
import React from 'react';
import {AlignedAxisTick, ChartConfig, ChartContainer, ChartTooltip} from './chart';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {TrendingDown, TrendingUp} from 'lucide-react';

// A Ghost specific charts for analytics re-using ShadCN/UI and Recharts components

interface TooltipPayload {
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: {
        date?: string;
        formattedValue?: string;
        label?: string;
        diffValue?: null | number;
        formattedDiffValue?: null | string;
        [key: string]: string | number | null | undefined;
    };
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    range?: number;
    showHours?: boolean;
    color?: string;
    series?: GhAreaChartSeries[];
}

const GhCustomTooltipContent = ({active, payload, range, showHours, color, series}: TooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const {date, formattedValue, label, diffValue, formattedDiffValue} = payload[0].payload;

    // Multi-series mode: show all series in tooltip
    if (series && series.length > 1) {
        return (
            <div className="min-w-[120px] rounded-lg border bg-background px-3 py-2 shadow-lg">
                {date && <div className="mb-2 text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0, showHours)}</div>}
                {payload.map((entry) => {
                    const seriesConfig = series.find(s => s.dataKey === entry.dataKey);
                    const entryColor = seriesConfig?.color || entry.color;
                    const entryLabel = seriesConfig?.label || entry.name;

                    return (
                        <div key={entry.dataKey} className='mb-1 flex items-start gap-2 last:mb-0'>
                            <span className='mt-1.5 inline-block size-2 rounded-full opacity-70' style={{backgroundColor: entryColor}}></span>
                            <div className='flex grow items-start justify-between gap-5'>
                                <div className="text-sm text-muted-foreground">{entryLabel}</div>
                                <div className="font-mono font-medium">
                                    {formatNumber(entry.value)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Single-series mode (backward compatible)
    const displayValue = formattedValue || payload[0].value;

    return (
        <div className="min-w-[120px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0, showHours)}</div>}
            <div className='flex items-start gap-2'>
                <span className='mt-1.5 inline-block size-2 rounded-full opacity-70' style={{backgroundColor: color || 'hsl(var(--chart-blue))'}}></span>
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
    [key: string]: string | number; // Allow additional data keys for multiple series
}

export type GhAreaChartSeries = {
    dataKey: string;
    label: string;
    color: string;
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
    showHours?: boolean;
    series?: GhAreaChartSeries[]; // Optional array of series for multi-series charts
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
    dataFormatter = formatNumber,
    showHours = false,
    series
}) => {
    // Determine if this is multi-series mode
    const isMultiSeries = series && series.length > 1;

    // Calculate yRange based on all series if multi-series
    let yRange: [number, number];
    if (yAxisRange) {
        yRange = yAxisRange;
    } else if (isMultiSeries) {
        let max = -Infinity;
        data.forEach((item) => {
            series.forEach((s) => {
                const value = Number(item[s.dataKey]);
                if (!isNaN(value)) {
                    max = Math.max(max, value);
                }
            });
        });

        // Apply the same padding logic as single-series (2% padding)
        const padding = 0.02;
        const paddedMax = max === -Infinity ? 0 : max + (max * padding);

        // Always start at 0 for multi-series charts
        yRange = [0, paddedMax];
    } else {
        yRange = [getYRange(data).min, getYRange(data).max];
    }

    // Build chart config for single or multiple series
    const chartConfig = isMultiSeries
        ? series.reduce((acc, s) => {
            acc[s.dataKey] = {label: s.label};
            return acc;
        }, {} as ChartConfig)
        : {
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

    const xTickHoursOnly = showHours && range === 1;

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
                <CartesianGrid horizontal={showHorizontalLines} stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                    axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                    dataKey="date"
                    interval={0}
                    tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(String(value), range, showHours, xTickHoursOnly)} />}
                    tickFormatter={value => formatDisplayDateWithRange(String(value), range, showHours)}
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
                    content={<GhCustomTooltipContent color={color} range={range} series={series} showHours={showHours} />}
                    cursor={true}
                    isAnimationActive={false}
                    position={{y: 10}}
                />
                <defs>
                    {isMultiSeries ? (
                        // Create gradients for each series
                        series.map(s => (
                            <linearGradient key={s.dataKey} id={`fillChart-${id}-${s.dataKey}`} x1="0" x2="0" y1="0" y2="1">
                                <stop
                                    offset='5%'
                                    stopColor={s.color}
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset='95%'
                                    stopColor={s.color}
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        ))
                    ) : (
                        // Single series gradient (backward compatible)
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
                    )}
                </defs>
                {isMultiSeries ? (
                    // Render multiple Area components
                    series.map(s => (
                        <Area
                            key={s.dataKey}
                            baseValue={baseValue}
                            dataKey={s.dataKey}
                            fill={`url(#fillChart-${id}-${s.dataKey})`}
                            fillOpacity={0.2}
                            isAnimationActive={false}
                            stroke={s.color}
                            strokeWidth={1.5}
                            type="linear"
                        />
                    ))
                ) : (
                    // Single Area component (backward compatible)
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
                )}
            </AreaChart>
        </ChartContainer>
    );
};

export {
    GhAreaChart,
    GhCustomTooltipContent
};
