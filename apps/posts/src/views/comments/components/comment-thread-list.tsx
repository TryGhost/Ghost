import CommentContent from './comment-content';
import React from 'react';
import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    LucideIcon,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    formatNumber,
    formatTimestamp
} from '@tryghost/shade';
import {Comment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade';
import {useDisableMemberCommenting, useEnableMemberCommenting} from '@tryghost/admin-x-framework/api/members';
import {useState} from 'react';

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
    return formatted.replace(/(\d+),(\s+\d{4})/, '$1$2');
}

function RepliesLine({hasReplies}: {hasReplies: boolean}) {
    if (!hasReplies) {
        return null;
    }

    return (
        <div 
            className="from-muted-foreground/20 mb-2 h-full w-px grow rounded bg-gradient-to-b from-70% to-transparent" 
            data-testid="replies-line" 
        />
    );
}

interface CommentRowProps {
    comment: Comment;
    isReply?: boolean;
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
    disableMemberCommentingEnabled?: boolean;
}

function CommentRow({comment, isReply = false, onThreadClick, commentPermalinksEnabled, disableMemberCommentingEnabled}: CommentRowProps) {
    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();
    const {mutate: disableCommenting} = useDisableMemberCommenting();
    const {mutate: enableCommenting} = useEnableMemberCommenting();
    const [memberToDisable, setMemberToDisable] = useState<{member: Comment['member']; commentId: string} | null>(null);

    const confirmDisableCommenting = () => {
        if (memberToDisable?.member?.id) {
            disableCommenting({
                id: memberToDisable.member.id,
                reason: `Disabled from comment ${memberToDisable.commentId}`
            });
            setMemberToDisable(null);
        }
    };

    const handleEnableCommenting = (member: Comment['member']) => {
        if (member?.id) {
            enableCommenting({id: member.id});
        }
    };

    // Check if this comment has replies (from the nested structure we'll build)
    const hasReplies = (comment.replies?.length ?? 0) > 0 || (comment.count?.replies ?? 0) > 0;
    const containerClassName = (!hasReplies || isReply) ? 'mb-7' : 'mb-0';

    const avatar = (
        <div className={`bg-accent relative mb-3 flex size-6 min-w-6 shrink-0 items-center justify-center overflow-hidden rounded-full md:mb-4 md:size-8 md:min-w-8 ${comment.status === 'hidden' && 'opacity-50'}`}>
            {comment.member?.id && comment.member.avatar_image && (
                <div className='absolute inset-0'><img alt="Member avatar" className="size-full rounded-full object-cover" src={comment.member.avatar_image} /></div>
            )}
            <div>
                <LucideIcon.User className='text-muted-foreground !size-3 md:!size-4' size={12} />
            </div>
        </div>
    );

    return (
        <>
            <div className={`flex w-full flex-row ${containerClassName}`}>
                <div className="mr-2 flex shrink-0 flex-col items-center justify-start md:mr-3">
                    {avatar}
                    <RepliesLine hasReplies={hasReplies} />
                </div>
                <div className="grow">
                    <div
                        className="w-full"
                        data-comment-id={comment.id}
                        data-testid="comment-thread-row"
                    >
                        <div className='flex min-w-0 flex-col'>
                            <div className='flex items-baseline gap-4'>
                                <div className={`mb-1 flex min-w-0 items-center gap-x-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                    <div className='whitespace-nowrap'>
                                        <span className="block truncate font-semibold">
                                            {comment.member?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    {disableMemberCommentingEnabled && comment.member?.can_comment === false && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span data-testid="commenting-disabled-indicator">
                                                        <LucideIcon.MessageCircleOff
                                                            className="text-muted-foreground size-3.5"
                                                        />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>Comments disabled</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    <LucideIcon.Dot className='text-muted-foreground/50 shrink-0' size={16} />
                                    <div className='shrink-0 whitespace-nowrap'>
                                        {comment.created_at && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-muted-foreground cursor-default text-sm">
                                                            {formatTimestamp(comment.created_at)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {formatDate(comment.created_at)}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                                {comment.status === 'hidden' && (
                                    <Badge variant='secondary'>Hidden</Badge>
                                )}
                            </div>

                            {comment.in_reply_to_snippet && !isReply && (
                                <div className={`mb-1 line-clamp-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                    <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                    <button
                                        className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-normal"
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
                                {hasReplies ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    className='flex cursor-pointer items-center gap-1 text-xs text-gray-800 hover:opacity-70'
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onThreadClick(comment.id);
                                                    }}
                                                >
                                                    <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                    <span>{formatNumber(comment.count?.replies || 0)}</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                    View replies
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className='flex items-center gap-1 text-xs text-gray-800'>
                                                    <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                    <span>{formatNumber(comment.count?.replies || 0)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                    Replies
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className='flex items-center gap-1 text-xs text-gray-800'>
                                                <LucideIcon.Heart size={16} strokeWidth={1.5} />
                                                <span>{formatNumber(comment.count?.likes || 0)}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                                Likes
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={`flex items-center gap-1 text-xs ${comment.count?.reports ? 'text-red font-semibold' : 'text-gray-800'}`}>
                                                <LucideIcon.Flag size={16} strokeWidth={(comment.count?.reports ? 1.75 : 1.5)} />
                                                <span>{formatNumber(comment.count?.reports || 0)}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                                Reports
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className="hover:bg-secondary relative z-10 text-gray-800 [&_svg]:size-4"
                                            size="sm"
                                            variant="ghost"
                                        >
                                            <LucideIcon.Ellipsis />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {commentPermalinksEnabled ? (
                                            <DropdownMenuItem asChild>
                                                <a href={`${comment.post!.url}#ghost-comments-${comment.id}`} rel="noopener noreferrer" target="_blank">
                                                    <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                        View on post
                                                </a>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem asChild>
                                                <a href={comment.post!.url} rel="noopener noreferrer" target="_blank">
                                                    <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                        View post
                                                </a>
                                            </DropdownMenuItem>
                                        )}
                                        {comment.member?.id && (
                                            <DropdownMenuItem asChild>
                                                <a href={`#/members/${comment.member.id}`}>
                                                    <LucideIcon.User className="mr-2 size-4" />
                                                        View member
                                                </a>
                                            </DropdownMenuItem>
                                        )}
                                        {disableMemberCommentingEnabled && comment.member?.id && (
                                            comment.member.can_comment !== false ? (
                                                <DropdownMenuItem onClick={() => {
                                                    queueMicrotask(() => setMemberToDisable({member: comment.member, commentId: comment.id}));
                                                }}>
                                                    <LucideIcon.MessageCircleOff className="mr-2 size-4" />
                                                        Disable commenting
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => handleEnableCommenting(comment.member)}>
                                                    <LucideIcon.MessageCircle className="mr-2 size-4" />
                                                        Enable commenting
                                                </DropdownMenuItem>
                                            )
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                        disableMemberCommentingEnabled={disableMemberCommentingEnabled}
                                        isReply={true}
                                        onThreadClick={onThreadClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={!!memberToDisable} onOpenChange={(open) => {
                if (!open) {
                    setMemberToDisable(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disable comments</DialogTitle>
                        <DialogDescription>
                            {memberToDisable?.member?.name || 'This member'} won&apos;t be able to comment
                            in the future. You can re-enable commenting anytime.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberToDisable(null)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmDisableCommenting}>
                            Disable comments
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface CommentThreadListProps {
    parentComment: Comment;
    replies: Comment[];
    onThreadClick: (commentId: string) => void;
    commentPermalinksEnabled?: boolean;
    disableMemberCommentingEnabled?: boolean;
}

const CommentThreadList: React.FC<CommentThreadListProps> = ({
    parentComment,
    replies,
    onThreadClick,
    commentPermalinksEnabled,
    disableMemberCommentingEnabled
}) => {
    // Build a nested tree structure from flat replies array
    // Group replies by their parent_id to create nested structure
    // Uses a Set to prevent infinite recursion from circular references (defensive)
    const buildCommentTree = (parent: Comment, allReplies: Comment[], visitedIds = new Set<string>()): Comment => {
        // Prevent infinite recursion (defensive check)
        if (visitedIds.has(parent.id)) {
            return {...parent, replies: []};
        }
        visitedIds.add(parent.id);

        // Find direct replies to this parent
        const directReplies = allReplies.filter(reply => reply.parent_id === parent.id);
        
        // Recursively build tree for each direct reply
        const nestedReplies = directReplies.map(reply => buildCommentTree(reply, allReplies, new Set(visitedIds)));
        
        // Return parent with nested replies
        return {
            ...parent,
            replies: nestedReplies
        };
    };

    // Build the tree starting from parent comment
    // Only build tree if we have replies to process
    const commentWithReplies = replies.length > 0 
        ? buildCommentTree(parentComment, replies)
        : {...parentComment, replies: []};

    return (
        <div className="-mt-4 flex flex-col pt-8 lg:-mt-8" data-testid="comment-thread-list">
            <CommentRow 
                comment={commentWithReplies}
                commentPermalinksEnabled={commentPermalinksEnabled}
                disableMemberCommentingEnabled={disableMemberCommentingEnabled}
                onThreadClick={onThreadClick}
            />
        </div>
    );
};

export default CommentThreadList;
