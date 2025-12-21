import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    cn,
    formatNumber,
    formatTimestamp
} from '@tryghost/shade';
import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {forwardRef, useEffect, useRef, useState} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';

const SpacerRow = ({height}: { height: number }) => (
    <tr aria-hidden="true" className="flex lg:table-row">
        <td className="flex lg:table-cell" style={{height}} />
    </tr>
);

// TODO: Remove forwardRef once we have upgraded to React 19
const PlaceholderRow = forwardRef<HTMLTableRowElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <TableRow
            ref={ref}
            {...props}
            aria-hidden="true"
            className="relative flex flex-col lg:table-row"
        >
            <TableCell className="relative z-10 h-24 animate-pulse">
                <div className="h-full rounded-md bg-muted" data-testid="loading-placeholder" />
            </TableCell>
        </TableRow>
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

function ExpandButton({onClick, expanded}: {onClick: () => void; expanded: boolean}) {
    return (
        <Button
            className="shrink-0 gap-0.5 self-start p-0 text-muted-foreground hover:bg-transparent"
            size="sm"
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
                // Check if the content is clamped by comparing scrollHeight with clientHeight
                setIsClamped(contentRef.current.scrollHeight > contentRef.current.clientHeight);
            }
        };

        checkIfClamped();
        // Recheck on window resize
        window.addEventListener('resize', checkIfClamped);
        return () => window.removeEventListener('resize', checkIfClamped);
    }, [item.html]);

    return (
        <div className={`mt-1 flex flex-col gap-2`}>
            <div className="flex max-w-[720px] flex-col items-start">
                <div
                    dangerouslySetInnerHTML={{__html: item.html || ''}}
                    ref={contentRef}
                    className={cn(
                        'prose flex-1 text-base leading-[1.45em] [&_*]:text-base [&_*]:font-normal [&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground [&_blockquote]:p-0 [&_blockquote]:pl-3 [&_blockquote_p]:mt-0 [&_a]:underline',
                        (isExpanded ?
                            '-mb-1 [&_p]:mb-[0.85em]'
                            :
                            'line-clamp-2 [&_p]:m-0 [&_blockquote+p]:mt-1'),
                        (item.status === 'hidden' && 'text-muted-foreground [&_blockquote]:border-foreground-muted')
                    )}
                />
                {isClamped && (
                    <ExpandButton expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} />
                )}
            </div>
        </div>
    );
}

function CommentsList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onAddFilter,
    isLoading
}: {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    onAddFilter: (field: string, value: string, operator?: string) => void;
    isLoading?: boolean;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    
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
    const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

    const confirmDelete = () => {
        if (commentToDelete) {
            deleteComment({id: commentToDelete.id});
            setCommentToDelete(null);
        }
    };

    return (
        <div ref={parentRef} className="overflow-hidden">
            <Table
                className="flex table-fixed flex-col lg:table"
                data-testid="comments-list"
            >
                <TableHeader className="hidden lg:!visible lg:!table-header-group">
                    <TableRow>
                        <TableHead className="h-0 px-4 py-0"></TableHead>
                        <TableHead className="h-0 w-36 px-4 py-0"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="flex flex-col lg:table-row-group">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder =
                            virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        return (
                            <TableRow
                                key={key}
                                {...props}
                                className="grid w-full grid-cols-[1fr_5rem] items-center gap-x-4 p-2 hover:bg-muted/50 md:grid-cols-[1fr_auto_5rem] lg:table-row lg:p-0 [&.group:hover_td]:bg-transparent"
                                data-testid="comment-list-row"
                            >
                                <TableCell className="static col-start-1 col-end-1 row-start-1 row-end-1 flex min-w-0 flex-col p-4 md:relative lg:table-cell">
                                    <div className='flex flex-col gap-3'>
                                        <div className="flex flex-wrap items-center">
                                            {item.member?.id ? (
                                                    <Button
                                                        className={`flex h-auto items-center gap-1.5 truncate p-0 font-semibold text-primary hover:opacity-70 ${item.status === 'hidden' && 'text-muted-foreground'}`}
                                                        variant='link'
                                                        onClick={() => {
                                                            onAddFilter('author', item.member!.id);
                                                        }}
                                                    >
                                                        {/* TODO: replace temporary avatar with Avatar component once fallback is handled */}
                                                        <div className='relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-accent'>
                                                            {item.member.avatar_image && (
                                                                <div className='absolute inset-0'><img src={item.member.avatar_image} /></div>
                                                            )}
                                                            <div>
                                                                <LucideIcon.User className='!size-3 text-muted-foreground' size={12} />
                                                            </div>
                                                        </div>
                                                        {item.member.name || 'Unknown'}
                                                    </Button> 
                                            ) : (
                                                <span className="block truncate font-semibold">
                                                    {item.member?.name || 'Unknown'}
                                                </span>
                                            )}

                                            <LucideIcon.Dot className='text-muted-foreground/50' size={16} />

                                            <div className='flex flex-wrap items-baseline gap-1 text-muted-foreground'>
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
                                                <span>on</span>

                                                {item.post?.id && item.post?.title && onAddFilter ? (
                                                    <Button
                                                        className="block h-auto truncate p-0 font-medium  text-primary hover:opacity-70"
                                                        variant="link"
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

                                            {item.status === 'hidden' && (
                                                <>
                                                    <LucideIcon.Dot className='text-muted-foreground/50' size={16} />
                                                    <div className='mr-2 flex items-center gap-1 text-muted-foreground'>
                                                        Hidden from members
                                                    </div>
                                                </>
                                            )}

                                        </div>
                                        <CommentContent item={item} />
                                        <div className="flex flex-row flex-nowrap items-center gap-2">
                                            {item.status === 'published' && (
                                                <Button size="sm" variant="outline" onClick={() => hideComment({id: item.id})}>
                                                    <LucideIcon.EyeOff/>
                                                    Hide
                                                </Button>
                                            )}
                                            {item.status === 'hidden' && (
                                                <Button size="sm" variant="outline" onClick={() => showComment({id: item.id})}>
                                                    <LucideIcon.Eye/>
                                                    Show
                                                </Button>
                                            )}
                                            <div className='ml-4 flex items-center gap-3'>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={`ml-2 flex items-center gap-1 text-xs ${!item.count?.replies && 'text-muted-foreground/70'}`}>
                                                                <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                                                <span>{formatNumber(item.count?.replies)}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Replies
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={`ml-2 flex items-center gap-1 text-xs ${!item.count?.likes && 'text-muted-foreground/70'}`}>
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
                                                            <div className={`ml-2 flex items-center gap-1 text-xs ${item.count?.reports ? 'font-medium text-yellow-600 dark:text-yellow' : 'text-muted-foreground/70'}`}>
                                                                <LucideIcon.TriangleAlert size={16} strokeWidth={(item.count?.reports ? 1.75 : 1.5)} />
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
                                                        className="relative z-10 ml-1"
                                                        size="sm"
                                                        variant="ghost"
                                                    >
                                                        <LucideIcon.Ellipsis />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    {item.post?.url && (
                                                        <DropdownMenuItem asChild>
                                                            <a href={item.post.url} rel="noopener noreferrer" target="_blank">
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
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-2 row-end-3 p-0 text-right align-top md:col-start-3 md:col-end-3 lg:table-cell lg:p-4">
                                    {item.post?.feature_image ? (
                                        <img
                                            alt={item.post.title || 'Post feature image'}
                                            className="hidden aspect-video w-32 rounded object-cover lg:block"
                                            src={item.post.feature_image}
                                        />
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </TableBody>
            </Table>

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
        </div>
    );
}

export default CommentsList;
