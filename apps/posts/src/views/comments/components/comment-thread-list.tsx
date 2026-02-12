import CommentContent from './comment-content';
import React from 'react';
import {Button, LoadingIndicator, LucideIcon} from '@tryghost/shade';
import {Comment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {CommentAvatar} from './comment-avatar';
import {CommentHeader} from './comment-header';
import {CommentMenu} from './comment-menu';
import {CommentMetrics, buildThreadLink} from './comment-metrics';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';

function RepliesLine({hasReplies}: {hasReplies: boolean}) {
    if (!hasReplies) {
        return null;
    }

    return (
        <div
            className="mb-2 h-full w-px grow rounded bg-gradient-to-b from-muted-foreground/20 from-70% to-transparent"
            data-testid="replies-line"
        />
    );
}

interface CommentRowProps {
    comment: Comment;
    isReply?: boolean;
    isSelectedComment?: boolean;
    selectedCommentId?: string;
}

function CommentRow({comment, isReply = false, isSelectedComment = false, selectedCommentId}: CommentRowProps) {
    const [searchParams] = useSearchParams();
    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();

    // Check replies array for loaded objects, or count.direct_replies for unloaded
    // TODO: remove count.replies fallback once backend is fully rolled out
    const hasReplies = (comment.replies?.length ?? 0) > 0 || (comment.count?.direct_replies ?? comment.count?.replies ?? 0) > 0;
    const containerClassName = (!hasReplies || isReply) ? 'mb-7' : 'mb-0';

    return (
        <div className={`flex w-full flex-row ${containerClassName}`}>
            <div className="mr-2 flex shrink-0 flex-col items-center justify-start md:mr-3">
                <CommentAvatar
                    avatarImage={comment.member?.avatar_image}
                    className="mb-3 shrink-0 md:mb-4"
                    isHidden={comment.status === 'hidden'}
                    memberId={comment.member?.id}
                />
                <RepliesLine hasReplies={hasReplies && !isReply} />
            </div>
            <div className="grow">
                <div
                    className="w-full"
                    data-testid={`comment-thread-row-${comment.id}`}
                >
                    <div className='flex min-w-0 flex-col'>
                        <CommentHeader
                            canComment={comment.member?.can_comment}
                            createdAt={comment.created_at}
                            isHidden={comment.status === 'hidden'}
                            memberId={comment.member?.id}
                            memberName={comment.member?.name}
                        />

                        {comment.in_reply_to_snippet && isSelectedComment && (
                            <div className={`mb-1 line-clamp-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                <Link
                                    className="text-sm font-normal text-muted-foreground hover:text-foreground"
                                    data-testid="replied-to-link"
                                    to={buildThreadLink(searchParams, comment.in_reply_to_id || comment.parent_id) || ''}
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    {comment.in_reply_to_snippet}
                                </Link>
                            </div>
                        )}

                        <CommentContent item={comment} />

                        <div className="mt-4 flex flex-row flex-wrap items-center gap-3">
                            {comment.status === 'published' && (
                                <Button className='text-gray-800' size="sm" variant="outline" onClick={() => hideComment({id: comment.id})}>
                                    <LucideIcon.EyeOff/>
                                    <span className="max-md:hidden">Hide</span>
                                </Button>
                            )}
                            {comment.status === 'hidden' && (
                                <Button className='text-gray-800' size="sm" variant="outline" onClick={() => showComment({id: comment.id})}>
                                    <LucideIcon.Eye/>
                                    <span className="max-md:hidden">Show</span>
                                </Button>
                            )}
                            <CommentMetrics
                                comment={comment}
                            />
                            <CommentMenu
                                comment={comment}
                            />
                        </div>
                    </div>

                    {/* Render nested replies INSIDE the parent comment */}
                    {hasReplies && comment.replies && (
                        <div className="-ml-2 mb-4 mt-7 pl-2 md:-ml-3 md:mb-0 md:mt-8 md:pl-3">
                            {comment.replies.map(reply => (
                                <CommentRow
                                    key={reply.id}
                                    comment={reply}
                                    isReply={true}
                                    selectedCommentId={selectedCommentId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface CommentThreadListProps {
    selectedComment: Comment;
    replies: Comment[];
    selectedCommentId: string;
    fetchNextPage: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage: boolean;
}

const CommentThreadList: React.FC<CommentThreadListProps> = ({
    selectedComment,
    replies,
    selectedCommentId,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
}) => {
    // All replies are children of the selected comment (flat structure from API)
    const commentWithReplies: Comment = {...selectedComment, replies};

    return (
        <div className="flex flex-col" data-testid="comment-thread-list">
            <CommentRow
                comment={commentWithReplies}
                isSelectedComment={true}
                selectedCommentId={selectedCommentId}
            />
            {hasNextPage && (
                <div className="flex justify-center pb-4">
                    <Button
                        disabled={isFetchingNextPage}
                        variant="outline"
                        onClick={() => fetchNextPage()}
                    >
                        {isFetchingNextPage ? (
                            <>
                                <LoadingIndicator size="sm" />
                                Loading...
                            </>
                        ) : (
                            'Load more replies'
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default CommentThreadList;
