import CommentsContent from './components/CommentsContent';
import CommentsHeader from './components/CommentsHeader';
import CommentsLayout from './components/CommentsLayout';
import CommentsList from './components/CommentsList';
import React from 'react';
import {Button, EmptyIndicator, LoadingIndicator, LucideIcon} from '@tryghost/shade';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';

const Comments: React.FC = () => {
    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments();

    return (
        <CommentsLayout>
            <CommentsHeader />
            <CommentsContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading comments
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : !data?.comments.length ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyIndicator
                            title="No comments yet"
                        >
                            <LucideIcon.MessageSquare />
                        </EmptyIndicator>
                    </div>
                ) : (
                    <CommentsList
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        items={data?.comments ?? []}
                        totalItems={data?.meta?.pagination?.total ?? 0}
                    />
                )}
            </CommentsContent>
        </CommentsLayout>
    );
};

export default Comments;
