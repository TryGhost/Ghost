import EmptyStatView from '@/shared/analytics/empty-stat-view';
import React from 'react';
import StatsContent from './stats-content';
import {BarChartLoadingIndicator} from '@tryghost/shade/components';

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
    emptyComponent = <EmptyStatView className='-mt-10' />
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
