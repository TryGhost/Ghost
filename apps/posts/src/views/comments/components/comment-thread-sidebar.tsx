import CommentThreadList from './comment-thread-list';
import React from 'react';
import {
    Button,
    EmptyIndicator,
    LoadingIndicator,
    LucideIcon,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from '@tryghost/shade';
import {useCommentReplies, useReadComment} from '@tryghost/admin-x-framework/api/comments';

interface CommentThreadSidebarProps {
    commentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
}

const CommentThreadSidebar: React.FC<CommentThreadSidebarProps> = ({
    commentId,
    open,
    onOpenChange,
    onThreadClick,
    commentPermalinksEnabled
}) => {
    const {data: repliesData, isLoading: isLoadingReplies, isError: isRepliesError} = useCommentReplies(commentId ?? '', {
        enabled: open && !!commentId
    });

    // Fetch the parent comment separately using the read endpoint
    const {data: parentData, isLoading: isLoadingParent, isError: isParentError} = useReadComment(commentId ?? '', {
        enabled: open && !!commentId
    });

    const isLoading = isLoadingReplies || isLoadingParent;
    // Only show error if both queries failed, or if parent failed (we need parent to render)
    // If only replies failed, we can still show the parent comment
    const isError = isParentError || (isRepliesError && !parentData);

    // Get the parent comment from the read results
    const parentComment = parentData?.comments?.[0];

    // Get all replies (empty array if replies query failed)
    const replies = repliesData?.comments || [];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto px-6 pt-0 sm:max-w-[600px]'>
                <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 pb-4 backdrop-blur'>
                    <SheetTitle className='mb-2'>Thread</SheetTitle>
                </SheetHeader>
                <div>
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center py-8">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError || !parentComment ? (
                        <div className="flex h-full items-center justify-center py-8">
                            <EmptyIndicator
                                actions={
                                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                                        Back to comments
                                    </Button>
                                }
                                description="This thread may have been deleted or doesn't exist."
                                title="Thread not found"
                            >
                                <LucideIcon.MessageSquare />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <CommentThreadList
                            commentPermalinksEnabled={commentPermalinksEnabled}
                            parentComment={parentComment}
                            replies={replies}
                            onThreadClick={onThreadClick}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default CommentThreadSidebar;
