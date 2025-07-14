import EmptyStatView from './EmptyStatView';
import PostAnalyticsContent from './PostAnalyticsContent';
import React from 'react';

interface PostAnalyticsViewProps<T> {
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
}: PostAnalyticsViewProps<T>) => {
    return (
        <PostAnalyticsContent>
            {isLoading ? (
                loadingComponent
            ) : !data || data.length === 0 ? (
                emptyComponent
            ) : (
                children
            )}
        </PostAnalyticsContent>
    );
};

export default PostAnalyticsView;
