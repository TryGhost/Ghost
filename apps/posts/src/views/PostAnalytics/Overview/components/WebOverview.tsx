import React from 'react';
import {BarChartLoadingIndicator, GhAreaChart, GhAreaChartDataItem} from '@tryghost/shade';

interface WebOverviewProps {
    chartData?: GhAreaChartDataItem[];
    range: number;
    isLoading: boolean;
}

const WebOverview: React.FC<WebOverviewProps> = ({chartData, range, isLoading}) => {
    return (
        <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
            {isLoading ?
                <div className='flex h-[16vw] min-h-[320px] items-center justify-center'>
                    <BarChartLoadingIndicator />
                </div>
                :
                <GhAreaChart
                    className={'-mb-3 h-[16vw] max-h-[320px] w-full'}
                    color='hsl(var(--chart-blue))'
                    data={chartData || []}
                    id="visitors"
                    range={range}
                    syncId="overview-charts"
                />
            }
        </div>
    );
};

export default WebOverview;
