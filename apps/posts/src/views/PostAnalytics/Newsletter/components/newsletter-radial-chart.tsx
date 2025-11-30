import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, cn, formatPercentage} from '@tryghost/shade';

export type NewsletterRadialChartData = {
    datatype: string,
    value: number,
    fill: string,
    color: string
}

export interface NewsletterRadialChartProps {
    data: NewsletterRadialChartData[],
    config: ChartConfig,
    percentageValue?: number,
    percentageLabel?: string,
    className?: string,
    tooltip?: boolean,
    size?: 'sm' | 'md' | 'lg' | 'responsive'
}

export const NewsletterRadialChart:React.FC<NewsletterRadialChartProps> = ({
    config,
    data,
    percentageValue,
    percentageLabel,
    className,
    tooltip = true,
    size = 'responsive'
}) => {
    // Responsive sizing configuration
    const getSizeConfig = () => {
        switch (size) {
        case 'sm':
            return {
                barWidth: 28,
                innerRadiusStart: data.length > 1 ? 42 : 56,
                fontSize: {
                    percentage: '1.2rem',
                    label: '0.8rem'
                }
            };
        case 'md':
            return {
                barWidth: 36,
                innerRadiusStart: data.length > 1 ? 60 : 72,
                fontSize: {
                    percentage: '1.4rem',
                    label: '0.9rem'
                }
            };
        case 'lg':
            return {
                barWidth: 46,
                innerRadiusStart: data.length > 1 ? 72 : 94,
                fontSize: {
                    percentage: '1.6rem',
                    label: '1rem'
                }
            };
        case 'responsive':
        default:
            return {
                barWidth: 46,
                innerRadiusStart: data.length > 1 ? 72 : 94,
                fontSize: {
                    percentage: '1.6rem',
                    label: '1rem'
                }
            };
        }
    };

    const sizeConfig = getSizeConfig();

    const chartComponentConfig = {
        innerRadius: sizeConfig.innerRadiusStart,
        outerRadius: sizeConfig.innerRadiusStart + sizeConfig.barWidth,
        startAngle: 90,
        endAngle: -270
    };

    return (
        <ChartContainer
            className={cn('mx-auto', className)}
            config={config}
        >
            <Recharts.RadialBarChart
                data={data}
                endAngle={chartComponentConfig.endAngle}
                innerRadius={chartComponentConfig.innerRadius}
                outerRadius={chartComponentConfig.outerRadius}
                startAngle={chartComponentConfig.startAngle}
            >
                <defs>
                    {/* Define gradients for each data type */}
                    <radialGradient cx="30%" cy="30%" id="gradientPurple" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-purple))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-purple))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientBlue" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-blue))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientTeal" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-teal))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientGray" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-gray))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-gray))" stopOpacity={1} />
                    </radialGradient>
                </defs>
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 1]} tick={false} type="number" />
                <Recharts.RadialBar
                    cornerRadius={10}
                    dataKey="value"
                    minPointSize={-2}
                    background
                >
                    {data.length > 1 &&
                        <Recharts.LabelList
                            className="fill-black opacity-60"
                            dataKey="datatype"
                            fontSize={11}
                            position="insideStart"
                        />
                    }
                </Recharts.RadialBar>
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
                                        {percentageValue &&
                                            <tspan
                                                className="fill-foreground text-[1.6rem] font-semibold tracking-tight"
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) - 6}
                                            >
                                                {percentageValue}
                                            </tspan>
                                        }
                                        {percentageLabel &&
                                            <tspan
                                                className="fill-muted-foreground font-medium"
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 14}
                                            >
                                                {percentageLabel}
                                            </tspan>
                                        }
                                    </text>
                                );
                            }
                        }}
                    />
                </Recharts.PolarRadiusAxis>
                {tooltip &&
                <ChartTooltip
                    content={<ChartTooltipContent
                        formatter={(value, _, props) => {
                            return (
                                <div className='flex items-center gap-1'>
                                    <div className='size-2 rounded-full opacity-50' style={{backgroundColor: props.payload?.color}}></div>
                                    <div className='text-xs text-muted-foreground'>{props.payload?.datatype}</div>
                                    <div className='ml-3 font-mono text-xs'>{formatPercentage(value)}</div>
                                </div>
                            );
                        }}
                        nameKey="datatype"
                        hideLabel
                    />}
                    cursor={false}
                    isAnimationActive={false}
                />
                }
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};
