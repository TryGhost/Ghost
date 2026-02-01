import CommentContent from './comment-content';
import CommentThreadSidebar from './comment-thread-sidebar';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';
import {forwardRef, useEffect, useRef, useState} from 'react';
import {useDisableMemberCommenting, useEnableMemberCommenting} from '@tryghost/admin-x-framework/api/members';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';

const SpacerRow = ({height}: { height: number }) => (
    <div aria-hidden="true" className="flex">
        <div className="flex" style={{height}} />
    </div>
);

// TODO: Remove forwardRef once we have upgraded to React 19
const PlaceholderRow = forwardRef<HTMLDivElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <div
            ref={ref}
            {...props}
            aria-hidden="true"
            className="relative flex flex-col"
        >
            <div className="relative z-10 h-24 animate-pulse">
                <div className="h-full rounded-md bg-muted" data-testid="loading-placeholder" />
            </div>
        </div>
    );
});

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
    // Remove comma between day and year (e.g., "Dec 17, 2025" -> "Dec 17 2025")
    return formatted.replace(/(\d+),(\s+\d{4})/, '$1$2');
}

function CommentsList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onAddFilter,
    isLoading,
    commentPermalinksEnabled,
    disableMemberCommentingEnabled
}: {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    onAddFilter: (field: string, value: string, operator?: string) => void;
    isLoading?: boolean;
    commentPermalinksEnabled?: boolean;
    disableMemberCommentingEnabled?: boolean;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [threadSidebarOpen, setThreadSidebarOpen] = useState(false);
    const [selectedThreadCommentId, setSelectedThreadCommentId] = useState<string | null>(null);

    const handleOpenThread = (commentId: string) => {
        // Update URL to open thread sidebar
        const newParams = new URLSearchParams(searchParams);
        newParams.set('thread', `is:${commentId}`);
        setSearchParams(newParams, {replace: false});
    };

    const handleThreadClick = (commentId: string) => {
        // Update URL to show the clicked thread
        const newParams = new URLSearchParams(searchParams);
        newParams.set('thread', `is:${commentId}`);
        // Remove reply_to when navigating to a new thread
        newParams.delete('reply_to');
        setSearchParams(newParams, {replace: false});
    };

    const handleCloseSidebar = (open: boolean) => {
        setThreadSidebarOpen(open);
        if (!open) {
            // Remove thread and reply_to params from URL when sidebar closes
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('thread');
            newParams.delete('reply_to');
            setSearchParams(newParams, {replace: true});
        }
    };

    // Check for thread query parameter and open sidebar
    useEffect(() => {
        const threadParam = searchParams.get('thread');
        if (threadParam) {
            // Parse format: "is:comment-id"
            const match = threadParam.match(/^is:(.+)$/);
            if (match && match[1]) {
                const threadId = match[1];
                setSelectedThreadCommentId(threadId);
                setThreadSidebarOpen(true);
            } else {
                // No valid thread param, close sidebar
                setThreadSidebarOpen(false);
                setSelectedThreadCommentId(null);
            }
        } else {
            // No thread param, close sidebar
            setThreadSidebarOpen(false);
            setSelectedThreadCommentId(null);
        }
    }, [searchParams]);

    // Restore scroll position when navigating back from filtered views
    useScrollRestoration({parentRef, isLoading});

    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        parentRef
    });

    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();
    const {mutate: deleteComment} = useDeleteComment();
    const {mutate: disableCommenting} = useDisableMemberCommenting();
    const {mutate: enableCommenting} = useEnableMemberCommenting();
    const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
    const [memberToDisable, setMemberToDisable] = useState<{member: Comment['member']; commentId: string} | null>(null);

    const confirmDelete = () => {
        if (commentToDelete) {
            deleteComment({id: commentToDelete.id});
            setCommentToDelete(null);
        }
    };

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

    return (
        <div ref={parentRef} className="overflow-hidden">
            <div
                className="flex flex-col"
                data-testid="comments-list"
            >
                <div className="flex flex-col">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder =
                            virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        return (
                            <div
                                key={key}
                                {...props}
                                className="grid w-full grid-cols-1 items-start justify-between gap-4 border-b p-3 hover:bg-muted/50 md:p-5 lg:grid-cols-[minmax(0,1fr)_144px]"
                                data-testid="comment-list-row"
                                onClick={() => {
                                    // Close sidebar when clicking on a comment in the main list
                                    if (threadSidebarOpen) {
                                        handleCloseSidebar(false);
                                    }
                                }}
                            >
                                <div className='flex items-start gap-3'>
                                    <div className={`relative flex size-6 min-w-6 items-center justify-center overflow-hidden rounded-full bg-accent md:size-8 md:min-w-8 ${item.status === 'hidden' && 'opacity-50'}`}>
                                        {item.member?.id && item.member.avatar_image && (
                                            <div className='absolute inset-0'><img alt="Member avatar" src={item.member.avatar_image} /></div>
                                        )}
                                        <div>
                                            <LucideIcon.User className='!size-3 text-muted-foreground md:!size-4' size={12} />
                                        </div>
                                    </div>

                                    <div className='flex min-w-0 flex-col'>
                                        <div className='flex items-baseline gap-4'>
                                            <div className={`mb-1 flex min-w-0 items-center gap-x-1 text-sm ${item.status === 'hidden' && 'opacity-50'}`}>
                                                <div className='whitespace-nowrap'>
                                                    {item.member?.id ? (
                                                        <Button
                                                            className={`flex h-auto items-center gap-1.5 truncate p-0 font-semibold text-primary hover:opacity-70`}
                                                            variant='link'
                                                            onClick={() => {
                                                                onAddFilter('author', item.member!.id);
                                                            }}
                                                        >
                                                            {item.member.name || 'Unknown'}
                                                        </Button>
                                                    ) : (
                                                        <span className="block truncate font-semibold">
                                                            {item.member?.name || 'Unknown'}
                                                        </span>
                                                    )}
                                                </div>
                                                {disableMemberCommentingEnabled && item.member?.can_comment === false && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span data-testid="commenting-disabled-indicator">
                                                                    <LucideIcon.MessageCircleOff
                                                                        className="size-3.5 text-muted-foreground"
                                                                    />
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Comments disabled</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                <LucideIcon.Dot className='shrink-0 text-muted-foreground/50' size={16} />
                                                <div className='shrink-0 whitespace-nowrap'>
                                                    {item.created_at && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-default text-sm text-muted-foreground">
                                                                        {formatTimestamp(item.created_at)}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {formatDate(item.created_at)}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                                <div className='shrink-0 text-muted-foreground'>on</div>
                                                <div className='min-w-0 truncate'>
                                                    {item.post?.id && item.post?.title && onAddFilter ? (
                                                        <Button
                                                            className="block h-auto w-full cursor-pointer truncate p-0 text-left font-medium text-gray-800 hover:opacity-70 dark:text-gray-400"
                                                            variant='link'
                                                            onClick={() => onAddFilter('post', item.post!.id)}
                                                        >
                                                            {item.post.title}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                    Unknown post
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.status === 'hidden' && (
                                                <Badge variant='secondary'>Hidden</Badge>
                                            )}
                                        </div>

                                        {item.in_reply_to_snippet && (
                                            <div className={`mb-1 line-clamp-1 text-sm ${item.status === 'hidden' && 'opacity-50'}`}>
                                                <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                                <Link
                                                    className="text-sm font-normal text-muted-foreground hover:text-foreground"
                                                    to={(() => {
                                                        // Preserve existing query params and add/update thread params
                                                        const newParams = new URLSearchParams(searchParams);
                                                        newParams.set('thread', `is:${item.parent_id}`);
                                                        if (item.in_reply_to_id) {
                                                            newParams.set('reply_to', `is:${item.in_reply_to_id}`);
                                                        }
                                                        return `?${newParams.toString()}`;
                                                    })()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {item.in_reply_to_snippet}
                                                </Link>
                                            </div>
                                        )}

                                        <CommentContent item={item} />

                                        <div className="mt-4 flex flex-row flex-nowrap items-center gap-3">
                                            {item.status === 'published' && (
                                                <Button className='text-gray-800' size="sm" variant="outline" onClick={() => hideComment({id: item.id})}>
                                                    <LucideIcon.EyeOff/>
                                                    Hide
                                                </Button>
                                            )}
                                            {item.status === 'hidden' && (
                                                <Button className='text-gray-800' size="sm" variant="outline" onClick={() => showComment({id: item.id})}>
                                                    <LucideIcon.Eye/>
                                                    Show
                                                </Button>
                                            )}
                                            <div className='flex items-center gap-4'>
                                                {item.count?.replies ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    className='ml-2 flex cursor-pointer items-center gap-1 text-xs text-gray-800 hover:opacity-70'
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent closing sidebar
                                                                        handleOpenThread(item.id);
                                                                    }}
                                                                >
                                                                    <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                                    <span>{formatNumber(item.count?.replies)}</span>
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
                                                                <div className='ml-2 flex items-center gap-1 text-xs text-gray-800'>
                                                                    <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                                    <span>{formatNumber(item.count?.replies)}</span>
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
                                                            <div className='ml-2 flex items-center gap-1 text-xs text-gray-800'>
                                                                <LucideIcon.Heart size={16} strokeWidth={1.5} />
                                                                <span>{formatNumber(item.count?.likes)}</span>
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
                                                            <div className={`ml-2 flex items-center gap-1 text-xs ${item.count?.reports ? 'font-semibold text-red' : 'text-gray-800'}`}>
                                                                <LucideIcon.Flag size={16} strokeWidth={(item.count?.reports ? 1.75 : 1.5)} />
                                                                <span>{formatNumber(item.count?.reports)}</span>
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
                                                    {commentPermalinksEnabled ? (
                                                        <DropdownMenuItem asChild>
                                                            <a href={`${item.post!.url}#ghost-comments-${item.id}`} rel="noopener noreferrer" target="_blank">
                                                                <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                            View on post
                                                            </a>
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem asChild>
                                                            <a href={item.post!.url} rel="noopener noreferrer" target="_blank">
                                                                <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                            View post
                                                            </a>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {item.member?.id && (
                                                        <DropdownMenuItem asChild>
                                                            <a href={`#/members/${item.member.id}`}>
                                                                <LucideIcon.User className="mr-2 size-4" />
                                                                View member
                                                            </a>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {disableMemberCommentingEnabled && item.member?.id && (
                                                        item.member.can_comment !== false ? (
                                                            <DropdownMenuItem onClick={() => {
                                                                setMemberToDisable({member: item.member, commentId: item.id});
                                                            }}>
                                                                <LucideIcon.MessageCircleOff className="mr-2 size-4" />
                                                                Disable commenting
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleEnableCommenting(item.member)}>
                                                                <LucideIcon.MessageCircle className="mr-2 size-4" />
                                                                Enable commenting
                                                            </DropdownMenuItem>
                                                        )
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {item.post?.feature_image ? (
                                        <img
                                            alt={item.post.title || 'Post feature image'}
                                            className={`hidden aspect-video w-36 rounded object-cover lg:block ${item.status === 'hidden' && 'opacity-50'}`}
                                            src={item.post.feature_image}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
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

            <CommentThreadSidebar
                commentId={selectedThreadCommentId}
                commentPermalinksEnabled={commentPermalinksEnabled}
                disableMemberCommentingEnabled={disableMemberCommentingEnabled}
                open={threadSidebarOpen}
                onOpenChange={handleCloseSidebar}
                onThreadClick={handleThreadClick}
            />
        </div>
    );
}

export default CommentsList;
