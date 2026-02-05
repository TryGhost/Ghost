import CommentThreadList from './comment-thread-list';
import React from 'react';
import {
    Button,
    EmptyIndicator,
    LoadingIndicator,
    LucideIcon,
    Separator,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from '@tryghost/shade';
import {useReadComment, useThreadComments} from '@tryghost/admin-x-framework/api/comments';

interface CommentThreadSidebarProps {
    commentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    commentPermalinksEnabled?: boolean;
}

const CommentThreadSidebar: React.FC<CommentThreadSidebarProps> = ({
    commentId,
    open,
    onOpenChange,
    commentPermalinksEnabled
}) => {
    const {data: threadData, isLoading: isLoadingThread, isError: isThreadError} = useThreadComments(commentId ?? '', {
        enabled: open && !!commentId
    });

    // Fetch the selected comment separately using the read endpoint
    const {data: selectedData, isLoading: isLoadingSelected, isError: isSelectedError} = useReadComment(commentId ?? '', {
        enabled: open && !!commentId
    });

    const isLoading = isLoadingThread || isLoadingSelected;
    // Only show error if both queries failed, or if selected comment failed (we need it to render)
    // If only thread query failed, we can still show the selected comment
    const isError = isSelectedError || (isThreadError && !selectedData);

    // Get the selected comment from the read results
    const selectedComment = selectedData?.comments?.[0];

    // Get all thread comments (empty array if thread query failed)
    const threadReplies = threadData?.comments || [];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto px-6 pt-0 sm:max-w-[600px]'>
                <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                    <SheetTitle className='text-md'>Thread</SheetTitle>
                </SheetHeader>
                {selectedComment?.post && (
                    <>
                        <div className="flex items-center gap-4">
                            <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-1 text-xl font-semibold text-foreground">
                                    {selectedComment.post.title}
                                </h3>
                                {selectedComment.post.excerpt && (
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                        {selectedComment.post.excerpt}
                                    </p>
                                )}
                            </div>
                            {selectedComment.post.feature_image && (
                                <img
                                    alt={selectedComment.post.title || 'Post feature image'}
                                    className="hidden aspect-video h-18 shrink-0 rounded object-cover lg:block"
                                    src={selectedComment.post.feature_image}
                                />
                            )}
                        </div>
                        <Separator className="-mx-6 my-6 w-auto" />
                    </>
                )}
                <div>
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center py-8">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError || !selectedComment ? (
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
                            replies={threadReplies}
                            selectedComment={selectedComment}
                            selectedCommentId={commentId ?? ''}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default CommentThreadSidebar;
