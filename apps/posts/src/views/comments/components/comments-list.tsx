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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@tryghost/shade';
import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {forwardRef, useEffect, useRef, useState} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';

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
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
}

function CommentContent({html, item}: {html: string; item: Comment}) {
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
    }, [html]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col items-start">
                <div
                    dangerouslySetInnerHTML={{__html: html}}
                    ref={contentRef}
                    className={`prose flex-1 text-base [&_*]:m-0 [&_*]:inline ${isExpanded ? '' : 'line-clamp-2'} ${item.status === 'hidden' && 'opacity-50'}`}
                />
                <div className='flex items-center gap-4'>
                    {item.status === 'hidden' && (
                        <div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
                            <LucideIcon.EyeOff size={12} strokeWidth={1.5} />
                            Comment hidden
                        </div>
                    )}
                    {isClamped && !isExpanded && (
                        <Button
                            className="shrink-0 gap-0.5 p-0 text-muted-foreground hover:bg-transparent"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsExpanded(true)}
                        >
                        Show more
                            <LucideIcon.ChevronDown />
                        </Button>
                    )}
                    {isExpanded && (
                        <Button
                            className="gap-0.5 self-start p-0 text-muted-foreground hover:bg-transparent"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsExpanded(false)}
                        >
                        Show less
                            <LucideIcon.ChevronUp />
                        </Button>
                    )}
                </div>
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
    onAddFilter
}: {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    onAddFilter?: (field: string, value: string, operator?: string) => void;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
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

    const handleDeleteClick = (comment: Comment) => {
        setCommentToDelete(comment);
    };

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
                        <TableHead className="w-1/2 px-4">
                            Comment
                        </TableHead>
                        <TableHead className="w-1/6 px-4">Author</TableHead>
                        <TableHead className="w-1/6 px-4">Post</TableHead>
                        <TableHead className="w-1/6 px-4">Date</TableHead>
                        <TableHead className="w-56 px-4"></TableHead>
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
                                <TableCell className="static col-start-1 col-end-1 row-start-1 row-end-1 flex min-w-0 flex-col p-0 md:relative lg:table-cell lg:p-4">
                                    {item.html ? (
                                        <CommentContent html={item.html} item={item} />
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Deleted comment
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-2 row-end-2 flex p-0 lg:table-cell lg:p-4">
                                    {item.member?.id ? (
                                        <a
                                            className="block truncate text-primary hover:underline"
                                            href={`#/members/${item.member.id}`}
                                        >
                                            {item.member.name || 'Unknown'}
                                        </a>
                                    ) : (
                                        <span className="block truncate">
                                            {item.member?.name || 'Unknown'}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-3 row-end-3 flex p-0 md:col-start-2 md:col-end-2 md:row-start-1 md:row-end-3 lg:table-cell lg:p-4">
                                    {item.post?.id && item.post?.title ? (
                                        <a
                                            className="block truncate text-primary hover:underline"
                                            href={`#/editor/post/${item.post.id}`}
                                        >
                                            {item.post.title}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Unknown post
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-4 row-end-4 p-0 lg:table-cell lg:p-4">
                                    <span className="text-sm text-muted-foreground">
                                        {item.created_at &&
                                            formatDate(item.created_at)
                                        }
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-2 row-end-3 p-0 md:col-start-3 md:col-end-3 lg:table-cell lg:p-4">
                                    <div className="flex flex-row flex-nowrap justify-end gap-2">
                                        {item.status === 'published' && (
                                            <Button size="sm" variant="outline" onClick={() => hideComment({id: item.id})}>
                                                <LucideIcon.EyeOff/>
                                                Hide comment
                                            </Button>
                                        )}
                                        {item.status === 'hidden' && (
                                            <Button size="sm" variant="outline" onClick={() => showComment({id: item.id})}>
                                                <LucideIcon.Eye/>
                                                Show comment
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    className="relative z-10"
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <LucideIcon.MoreVertical />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {item.post?.url && (
                                                    <DropdownMenuItem asChild>
                                                        <a href={item.post.url} rel="noopener noreferrer" target="_blank">
                                                            <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                        View post
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                {item.post?.id && onAddFilter && (
                                                    <DropdownMenuItem onClick={() => onAddFilter('post', item.post!.id)}>
                                                        <LucideIcon.FileText className="mr-2 size-4" />
                                                    Filter by post
                                                    </DropdownMenuItem>
                                                )}
                                                {item.member?.id && onAddFilter && (
                                                    <DropdownMenuItem onClick={() => onAddFilter('author', item.member!.id)}>
                                                        <LucideIcon.User className="mr-2 size-4" />
                                                    Filter by author
                                                    </DropdownMenuItem>
                                                )}
                                                {item.status !== 'deleted' && <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => handleDeleteClick(item)}
                                                    >
                                                        <LucideIcon.Trash2 className="mr-2 size-4" />
                                                    Delete comment
                                                    </DropdownMenuItem>
                                                </>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
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
