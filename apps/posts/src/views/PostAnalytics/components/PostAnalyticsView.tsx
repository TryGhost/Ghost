import EmptyStatView from './EmptyStatView';
import React from 'react';
import StatsContent from './PostAnalyticsContent';

interface StatsViewProps<T> {
    isLoading?: boolean;
    data?: T[] | null;
    children?: React.ReactNode;
    loadingComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
}

const PostAnalyticsView = <T,>({
    isLoading,
    data,
    children,
    loadingComponent = <>Loading...</>,
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

export default PostAnalyticsView;
