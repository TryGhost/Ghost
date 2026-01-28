import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
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
    cn,
    formatNumber,
    formatTimestamp
} from '@tryghost/shade';
import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useEffect, useRef, useState} from 'react';

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
            className="mb-2 h-full w-px grow rounded bg-gradient-to-b from-muted-foreground/20 from-70% to-transparent" 
            data-testid="replies-line" 
        />
    );
}

function ExpandButton({onClick, expanded}: {onClick: () => void; expanded: boolean}) {
    return (
        <Button
            className="shrink-0 gap-0.5 self-start p-0 text-base hover:bg-transparent"
            variant="ghost"
            onClick={onClick}
        >
            {expanded ? 'Show less' : 'Show more'}
            {expanded ? <LucideIcon.ChevronUp /> : <LucideIcon.ChevronDown />}
        </Button>
    );
}

function CommentContent({item}: {item: Comment}) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isClamped, setIsClamped] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const checkIfClamped = () => {
            if (contentRef.current) {
                setIsClamped(contentRef.current.scrollHeight > contentRef.current.clientHeight);
            }
        };

        checkIfClamped();
        window.addEventListener('resize', checkIfClamped);
        return () => window.removeEventListener('resize', checkIfClamped);
    }, [item.html]);

    return (
        <div className={`mt-1 flex flex-col gap-2`}>
            <div className={`flex max-w-[720px] flex-col items-start ${item.status === 'hidden' && 'opacity-50'}`}>
                <div
                    dangerouslySetInnerHTML={{__html: item.html || ''}}
                    ref={contentRef}
                    className={cn(
                        'prose flex-1 text-base leading-[1.5em] [&_*]:leading-[1.5em] [&_*]:text-base [&_*]:font-normal [&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground [&_blockquote]:p-0 [&_blockquote]:pl-3 [&_blockquote_p]:mt-0 [&_a]:underline',
                        (isExpanded ?
                            '-mb-1 [&_p]:mb-[0.85em]'
                            :
                            'line-clamp-2 [&_p]:m-0 [&_blockquote+p]:mt-1 mb-1')
                    )}
                />
                {isClamped && (
                    <ExpandButton expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} />
                )}
            </div>
        </div>
    );
}

function CommentRow({comment, isReply = false}: {comment: Comment; isReply?: boolean}) {
    const navigate = useNavigate();
    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();
    const {mutate: deleteComment} = useDeleteComment();
    const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

    const confirmDelete = () => {
        if (commentToDelete) {
            deleteComment({id: commentToDelete.id});
            setCommentToDelete(null);
        }
    };

    const hasReplies = comment.replies && comment.replies.length > 0;

    const containerClassName = (!hasReplies || isReply) ? 'mb-7' : 'mb-0';

    return (
        <>
            <div className={`flex w-full flex-row ${containerClassName}`}>
                <div className="mr-2 flex flex-col items-center justify-start md:mr-3 shrink-0">
                    <div className={`shrink-0 mb-3 md:mb-4 relative flex size-6 min-w-6 items-center justify-center overflow-hidden rounded-full bg-accent md:size-8 md:min-w-8 ${comment.status === 'hidden' && 'opacity-50'}`}>
                        {comment.member?.id && comment.member.avatar_image && (
                            <div className='absolute inset-0'><img alt="Member avatar" className="w-full h-full object-cover rounded-full" src={comment.member.avatar_image} /></div>
                        )}
                        <div>
                            <LucideIcon.User className='!size-3 text-muted-foreground md:!size-4' size={12} />
                        </div>
                    </div>
                    <RepliesLine hasReplies={hasReplies} />
                </div>
                <div className="grow">
                    <div
                        className="grid w-full grid-cols-1 items-start justify-between gap-4 lg:grid-cols-[minmax(0,1fr)_144px]"
                        data-testid="comment-thread-row"
                        data-comment-id={comment.id}
                    >
                        <div className="flex items-start gap-3">
                            <div className='flex min-w-0 flex-col'>
                                <div className='flex items-baseline gap-4'>
                            <div className={`mb-1 flex min-w-0 items-center gap-x-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                <div className='whitespace-nowrap'>
                                    <span className="block truncate font-semibold">
                                        {comment.member?.name || 'Unknown'}
                                    </span>
                                </div>
                                <LucideIcon.Dot className='shrink-0 text-muted-foreground/50' size={16} />
                                <div className='shrink-0 whitespace-nowrap'>
                                    {comment.created_at && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-default text-sm text-muted-foreground">
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

                            {comment.in_reply_to_snippet && (
                                <div className={`mb-1 line-clamp-1 text-sm ${comment.status === 'hidden' && 'opacity-50'}`}>
                                    <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {comment.in_reply_to_snippet}
                                    </span>
                                </div>
                            )}

                            <CommentContent item={comment} />

                            <div className="mt-4 flex flex-row flex-nowrap items-center gap-3">
                                {comment.status === 'published' && (
                                    <Button className='text-gray-800' size="sm" variant="outline" onClick={() => hideComment({id: comment.id})}>
                                        <LucideIcon.EyeOff/>
                                        Hide
                                    </Button>
                                )}
                                {comment.status === 'hidden' && (
                                    <Button className='text-gray-800' size="sm" variant="outline" onClick={() => showComment({id: comment.id})}>
                                        <LucideIcon.Eye/>
                                        Show
                                    </Button>
                                )}
                                <div className='flex items-center gap-4'>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {comment.count?.replies ? (
                                                    <button
                                                        className='ml-2 flex items-center gap-1 text-xs text-gray-800 hover:opacity-70 cursor-pointer'
                                                        onClick={() => navigate(`/comments/${comment.id}`)}
                                                    >
                                                        <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                        <span>{formatNumber(comment.count?.replies || 0)}</span>
                                                    </button>
                                                ) : (
                                                    <div className='ml-2 flex items-center gap-1 text-xs text-gray-800'>
                                                        <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                        <span>{formatNumber(comment.count?.replies || 0)}</span>
                                                    </div>
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {comment.count?.replies ? 'View replies' : 'Replies'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className='ml-2 flex items-center gap-1 text-xs text-gray-800'>
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
                                                <div className={`ml-2 flex items-center gap-1 text-xs ${comment.count?.reports ? 'font-semibold text-red' : 'text-gray-800'}`}>
                                                    <LucideIcon.Flag size={16} strokeWidth={(comment.count?.reports ? 1.75 : 1.5)} />
                                                    <span>{formatNumber(comment.count?.reports || 0)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Reports
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className="relative z-10 ml-1 text-gray-800 hover:bg-secondary [&_svg]:size-4"
                                            size="sm"
                                            variant="ghost"
                                        >
                                            <LucideIcon.Ellipsis />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {comment.post?.url && (
                                            <DropdownMenuItem asChild>
                                                <a href={comment.post.url} rel="noopener noreferrer" target="_blank">
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
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    <div>
                        {comment.post?.feature_image ? (
                            <img
                                alt={comment.post.title || 'Post feature image'}
                                className={`hidden aspect-video w-36 rounded object-cover lg:block ${comment.status === 'hidden' && 'opacity-50'}`}
                                src={comment.post.feature_image}
                            />
                        ) : null}
                    </div>
                </div>

                    {hasReplies && (
                        <div className="-ml-2 mb-4 mt-7 md:mb-0 md:mt-8">
                            {comment.replies.map((reply) => (
                                <CommentRow key={reply.id} comment={reply} isReply={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={!!commentToDelete} onOpenChange={open => !open && setCommentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This comment will be permanently deleted and cannot be recovered.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="hover:bg-red-700 bg-red-600 text-white"
                            onClick={confirmDelete}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

interface CommentThreadListProps {
    comment: Comment | null;
    isLoading?: boolean;
}

function CommentThreadList({comment, isLoading}: CommentThreadListProps) {
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
            </div>
        );
    }

    if (!comment) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">Comment not found</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col -mt-4 lg:-mt-8 pt-8" data-testid="comment-thread-list">
            <CommentRow comment={comment} />
        </div>
    );
}

export default CommentThreadList;
