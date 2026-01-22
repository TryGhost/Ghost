import CommentsContent from './components/comments-content';
import CommentsLayout from './components/comments-layout';
import CommentThreadList from './components/comment-thread-list';
import CommentThreadBreadcrumbs from './components/comment-thread-breadcrumbs';
import React, {useMemo} from 'react';
import {Button, EmptyIndicator, Header, LoadingIndicator, LucideIcon} from '@tryghost/shade';
import {useReadComment, useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import {useParams, useNavigate} from '@tryghost/admin-x-framework';

const CommentThread: React.FC = () => {
    const {commentId} = useParams<{commentId: string}>();
    const navigate = useNavigate();
    
    const {data: commentData, isLoading: isLoadingComment, isError: isErrorComment} = useReadComment(
        {id: commentId!},
        {enabled: !!commentId}
    );

    const parentComment = commentData?.comments?.[0];

    const hasReplies = (parentComment?.count?.replies || 0) > 0;
    const {data: repliesData, isLoading: isLoadingReplies} = useBrowseComments(
        {
            searchParams: {
                filter: `parent_id:${commentId}`,
                include: 'member,post,replies,replies.member,replies.count',
                limit: '100',
                order: 'created_at asc'
            }
        },
        {
            enabled: hasReplies && !!parentComment && !!commentId
        }
    );

    const commentWithReplies = useMemo(() => {
        if (!parentComment) {
            return null;
        }

        const allReplies = repliesData?.comments || parentComment.replies || [];
        
        if (allReplies.length > 0) {
            const flattenedReplies = allReplies.flatMap(reply => {
                const nestedReplies = reply.replies || [];
                return [reply, ...nestedReplies];
            });

            return {
                ...parentComment,
                replies: flattenedReplies
            };
        }

        return parentComment;
    }, [parentComment, repliesData]);

    const isLoading = isLoadingComment || (hasReplies && isLoadingReplies);
    const isError = isErrorComment;

    const commentSnippet = useMemo(() => {
        if (!parentComment?.html) {
            return 'Comment';
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parentComment.html;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        return text.trim() || 'Comment';
    }, [parentComment]);

    return (
        <CommentsLayout>
            <Header className="!pb-6" variant="inline-nav">
                <Header.Above>
                    <CommentThreadBreadcrumbs commentSnippet={commentSnippet} />
                </Header.Above>
                <Header.Title>Thread</Header.Title>
            </Header>
            <CommentsContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading comment
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Unable to load this comment thread
                        </p>
                        <Button onClick={() => navigate('/comments')}>
                            Back to comments
                        </Button>
                    </div>
                ) : !commentWithReplies ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <EmptyIndicator
                            title="Comment not found"
                        >
                            <LucideIcon.MessageSquare />
                        </EmptyIndicator>
                        <Button 
                            className="mt-4"
                            onClick={() => navigate('/comments')}
                        >
                            Back to comments
                        </Button>
                    </div>
                ) : (
                    <CommentThreadList
                        comment={commentWithReplies}
                        isLoading={isLoading}
                    />
                )}
            </CommentsContent>
        </CommentsLayout>
    );
};

export default CommentThread;
