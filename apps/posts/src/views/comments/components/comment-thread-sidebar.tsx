import CommentThreadList from './comment-thread-list';
import React from 'react';
import {
    Button,
    EmptyIndicator,
    H3,
    LoadingIndicator,
    LucideIcon,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    cn
} from '@tryghost/shade';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useCommentReplies, useReadComment} from '@tryghost/admin-x-framework/api/comments';

interface CommentThreadSidebarProps {
    commentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
    disableMemberCommentingEnabled?: boolean;
}

const CommentThreadSidebar: React.FC<CommentThreadSidebarProps> = ({
    commentId,
    open,
    onOpenChange,
    onThreadClick,
    commentPermalinksEnabled,
    disableMemberCommentingEnabled
}) => {
    const {data: repliesData, isLoading: isLoadingReplies, isError: isRepliesError} = useCommentReplies(commentId ?? '', {
        enabled: open && !!commentId
    });

    // Fetch the parent comment separately using the read endpoint
    const {data: parentData, isLoading: isLoadingParent, isError: isParentError} = useReadComment(commentId ?? '', {
        enabled: open && !!commentId
    });

    // Fetch site data for post preview
    const {data: siteData} = useBrowseSite();

    const isLoading = isLoadingReplies || isLoadingParent;
    // Only show error if both queries failed, or if parent failed (we need parent to render)
    // If only replies failed, we can still show the parent comment
    const isError = isParentError || (isRepliesError && !parentData);
    
    // Get the parent comment from the read results
    const parentComment = parentData?.comments?.[0];
    
    // Get all replies (empty array if replies query failed)
    const replies = repliesData?.comments || [];

    // Get post data from parent comment
    const post = parentComment?.post;
    const site = siteData?.site;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto px-6 pt-0 sm:max-w-[600px]'>
                <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 pb-4 backdrop-blur'>
                    <SheetTitle className='mb-4'>Thread</SheetTitle>
                    {post && (
                        <a 
                            className='flex items-stretch overflow-hidden rounded-md border transition-all hover:border-muted-foreground/40' 
                            href={post.url} 
                            rel="noopener noreferrer" 
                            target='_blank'
                        >
                            {post.feature_image && (
                                <div className='hidden w-24 shrink-0 bg-cover bg-center md:block' style={{
                                    backgroundImage: `url(${post.feature_image})`
                                }}></div>
                            )}
                            <div className='min-w-0 flex-1 p-3 text-left'>
                                <H3 className={cn('line-clamp-2 text-sm font-semibold leading-tight')}>{post.title}</H3>
                                {post.excerpt && (
                                    <p className='mt-1 line-clamp-2 text-xs leading-snug'>{post.excerpt}</p>
                                )}
                                {site && (
                                    <div className='mt-2 flex items-start gap-2'>
                                        {site.icon && (
                                            <div className='mt-0.5 size-4 shrink-0 bg-cover bg-center' style={{
                                                backgroundImage: `url(${site.icon})`
                                            }}></div>
                                        )}
                                        <div className='flex gap-1 text-xs'>
                                            <strong>{site.title}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </a>
                    )}
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
                            disableMemberCommentingEnabled={disableMemberCommentingEnabled}
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
