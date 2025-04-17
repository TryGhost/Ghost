import EmptyStatView from './EmptyStatView';
import LoadingIndicator from '../components/LoadingIndicator';
import React from 'react';
import StatsContent from './StatsContent';

interface StatsViewProps<T> {
    isLoading: boolean;
    data: T[] | null;
    children: React.ReactNode;
    loadingComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
}

const StatsView = <T,>({
    isLoading,
    data,
    children,
    loadingComponent = <LoadingIndicator />,
    emptyComponent = <EmptyStatView />
}: StatsViewProps<T>) => {
    return (
        <StatsContent>
            {isLoading ? (
                loadingComponent
            ) : !data || data.length === 0 ? (
                emptyComponent
            ) : (
                children
            )}
        </StatsContent>
    );
};

export default StatsView;
