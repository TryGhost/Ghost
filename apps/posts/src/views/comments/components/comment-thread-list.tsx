import CommentContent from './comment-content';
import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {Comment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {CommentAvatar} from './comment-avatar';
import {CommentHeader} from './comment-header';
import {CommentMenu} from './comment-menu';
import {CommentMetrics} from './comment-metrics';

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
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
}

function CommentRow({comment, isReply = false, onThreadClick, commentPermalinksEnabled}: CommentRowProps) {
    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();

    const hasReplies = (comment.replies?.length ?? 0) > 0 || (comment.count?.replies ?? 0) > 0;
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
                <RepliesLine hasReplies={hasReplies} />
            </div>
            <div className="grow">
                <div
                    className="w-full"
                    data-comment-id={comment.id}
                    data-testid="comment-thread-row"
                >
                    <div className='flex min-w-0 flex-col'>
                        <CommentHeader
                            canComment={comment.member?.can_comment}
                            createdAt={comment.created_at}
                            isHidden={comment.status === 'hidden'}
                            memberId={comment.member?.id}
                            memberName={comment.member?.name}
                        />

                        {comment.in_reply_to_snippet && !isReply && (
                            <div className={`mb-1 line-clamp-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                <button
                                    className="cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground"
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Navigate to the parent thread root (parent_id is the root of the thread)
                                        if (comment.parent_id) {
                                            onThreadClick(comment.parent_id);
                                        }
                                    }}
                                >
                                    {comment.in_reply_to_snippet}
                                </button>
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
                                hasReplies={hasReplies}
                                likesCount={comment.count?.likes}
                                repliesCount={comment.count?.replies}
                                reportsCount={comment.count?.reports}
                                onRepliesClick={hasReplies ? () => onThreadClick(comment.id) : undefined}
                            />
                            <CommentMenu
                                comment={comment}
                                commentPermalinksEnabled={commentPermalinksEnabled}
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
                                    commentPermalinksEnabled={commentPermalinksEnabled}
                                    isReply={true}
                                    onThreadClick={onThreadClick}
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
    parentComment: Comment;
    replies: Comment[];
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
}

const CommentThreadList: React.FC<CommentThreadListProps> = ({
    parentComment,
    replies,
    onThreadClick,
    commentPermalinksEnabled
}) => {
    // All replies are direct children of the parent comment (flat structure)
    const commentWithReplies: Comment = {...parentComment, replies};

    return (
        <div className="-mt-4 flex flex-col pt-8 lg:-mt-8" data-testid="comment-thread-list">
            <CommentRow
                comment={commentWithReplies}
                commentPermalinksEnabled={commentPermalinksEnabled}
                onThreadClick={onThreadClick}
            />
        </div>
    );
};

export default CommentThreadList;
