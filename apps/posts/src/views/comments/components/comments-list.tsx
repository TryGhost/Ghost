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
import {forwardRef, useRef, useState} from 'react';
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

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
    switch (status) {
    case 'published':
        return 'default';
    case 'hidden':
        return 'secondary';
    case 'deleted':
        return 'destructive';
    default:
        return 'default';
    }
}

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

function stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
                        <TableHead className="w-2/5 px-4">
                            Comment
                        </TableHead>
                        <TableHead className="w-1/5 px-4">Author</TableHead>
                        <TableHead className="w-1/5 px-4">Post</TableHead>
                        <TableHead className="w-1/6 px-4">Status</TableHead>
                        <TableHead className="w-1/6 px-4">Date</TableHead>
                        <TableHead className="w-20 px-4"></TableHead>
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

                        const commentText = stripHtml(item.html);
                        const truncatedComment = commentText.length > 100
                            ? `${commentText.substring(0, 100)}...`
                            : commentText;

                        return (
                            <TableRow
                                key={key}
                                {...props}
                                className="grid w-full grid-cols-[1fr_5rem] items-center gap-x-4 p-2 hover:bg-muted/50 md:grid-cols-[1fr_auto_5rem] lg:table-row lg:p-0 [&.group:hover_td]:bg-transparent"
                                data-testid="comment-list-row"
                            >
                                <TableCell className="static col-start-1 col-end-1 row-start-1 row-end-1 flex min-w-0 flex-col p-0 md:relative lg:table-cell lg:p-4">
                                    <span className="block text-base">
                                        {truncatedComment}
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-2 row-end-2 flex p-0 lg:table-cell lg:p-4">
                                    <span className="block truncate">
                                        {item.member?.name || 'Unknown'}
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-3 row-end-3 flex p-0 md:col-start-2 md:col-end-2 md:row-start-1 md:row-end-3 lg:table-cell lg:p-4">
                                    {item.post?.title ? (
                                        <span className="block truncate">
                                            {item.post.title}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Unknown post
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-1 row-end-1 p-0 lg:table-cell lg:p-4">
                                    <Badge className="capitalize" variant={getStatusBadgeVariant(item.status)}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-4 row-end-4 p-0 lg:table-cell lg:p-4">
                                    <span className="text-sm text-muted-foreground">
                                        {formatDate(item.created_at)}
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-2 row-end-3 p-0 md:col-start-3 md:col-end-3 lg:table-cell lg:p-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="relative z-10 w-12"
                                                size="icon"
                                                variant="outline"
                                            >
                                                <LucideIcon.MoreVertical />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {item.status === 'published' && (
                                                <DropdownMenuItem onClick={() => hideComment({id: item.id})}>
                                                    <LucideIcon.EyeOff className="mr-2 size-4" />
                                                    Hide comment
                                                </DropdownMenuItem>
                                            )}
                                            {item.status === 'hidden' && (
                                                <DropdownMenuItem onClick={() => showComment({id: item.id})}>
                                                    <LucideIcon.Eye className="mr-2 size-4" />
                                                    Show comment
                                                </DropdownMenuItem>
                                            )}
                                            {item.status !== 'deleted' && (
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleDeleteClick(item)}
                                                >
                                                    <LucideIcon.Trash2 className="mr-2 size-4" />
                                                    Delete comment
                                                </DropdownMenuItem>
                                            )}
                                            {(item.member?.id || item.post?.id) && onAddFilter && (
                                                <DropdownMenuSeparator />
                                            )}
                                            {item.member?.id && onAddFilter && (
                                                <DropdownMenuItem onClick={() => onAddFilter('author', item.member!.id)}>
                                                    <LucideIcon.User className="mr-2 size-4" />
                                                    Filter by author
                                                </DropdownMenuItem>
                                            )}
                                            {item.post?.id && onAddFilter && (
                                                <DropdownMenuItem onClick={() => onAddFilter('post', item.post!.id)}>
                                                    <LucideIcon.FileText className="mr-2 size-4" />
                                                    Filter by post
                                                </DropdownMenuItem>
                                            )}
                                            {item.post?.url && (
                                                <DropdownMenuItem asChild>
                                                    <a href={item.post.url} rel="noopener noreferrer" target="_blank">
                                                        <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                        View post
                                                    </a>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
