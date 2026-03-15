import EmptyStatView from './empty-stat-view';
import React from 'react';
import StatsContent from './stats-content';
import {BarChartLoadingIndicator} from '@tryghost/shade';

interface StatsViewProps<T> {
    isLoading: boolean;
    data?: T[] | null;
    children: React.ReactNode;
    loadingComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
}

const StatsView = <T,>({
    isLoading,
    data,
    children,
    loadingComponent = <BarChartLoadingIndicator />,
    emptyComponent = <EmptyStatView />
}: StatsViewProps<T>) => {
    return (
        <StatsContent>
            {isLoading ? (
                loadingComponent
            ) : (data !== undefined && data && data.length === 0) ? (
                emptyComponent
            ) : (
                children
            )}
        </StatsContent>
    );
};

export default StatsView;
