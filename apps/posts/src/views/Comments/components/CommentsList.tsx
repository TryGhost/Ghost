import {
    Badge,
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
    TableRow
} from '@tryghost/shade';
import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '../../Tags/components/VirtualTable/useInfiniteVirtualScroll';

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
    fetchNextPage
}: {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
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
                                        <a
                                            className="relative z-10 -m-4 inline-block p-4 hover:underline"
                                            href={`#/posts/${item.post_id}`}
                                        >
                                            {item.post.title}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Unknown post
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-1 row-end-1 p-0 lg:table-cell lg:p-4">
                                    <Badge variant={getStatusBadgeVariant(item.status)}>
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
                                            {item.post?.slug && (
                                                <DropdownMenuItem asChild>
                                                    <a href={`#/editor/post/${item.post_id}`}>
                                                        <LucideIcon.ExternalLink className="mr-2 size-4" />
                                                        Open post
                                                    </a>
                                                </DropdownMenuItem>
                                            )}
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
                                                    onClick={() => deleteComment({id: item.id})}
                                                >
                                                    <LucideIcon.Trash2 className="mr-2 size-4" />
                                                    Delete comment
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
        </div>
    );
}

export default CommentsList;
